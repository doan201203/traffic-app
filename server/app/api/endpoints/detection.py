import time
import logging
from fastapi import (
  APIRouter,
  File,
  UploadFile,
  HTTPException,
  Depends,
  Request,
  Query,
  WebSocket,
  WebSocketDisconnect
)

from PIL import UnidentifiedImageError
import json
import base64

from app.core.config import settings
from app.models.traffic_warning_models import TrafficWarningResponse, DetectionResult 

from core_models.yolo_detector import YOLODetector

from starlette.websockets import WebSocketState
from concurrent.futures import ProcessPoolExecutor

from websockets.exceptions import ConnectionClosed, ConnectionClosedOK, ConnectionClosedError

logger = logging.getLogger(__name__)
router = APIRouter()

def get_detector(request: Request) -> YOLODetector:
    if not hasattr(request.app.state, 'detector') or \
       request.app.state.detector is None or \
       not isinstance(request.app.state.detector, YOLODetector):
        logger.error(
            "API: YOLODetector not available or not a YOLODetector instance in app.state. "
            "Model might have failed to load or lifespan not configured correctly."
        )
        raise HTTPException(
            status_code=503,
            detail="Model service unavailable. Please check server logs or try again later."
        )
    return request.app.state.detector

@router.post(
  "/detect-frame",
  response_model=TrafficWarningResponse,
  summary="Detect frame", 
)
async def detect_traffic_warning(
  detector: YOLODetector = Depends(get_detector),
  file: UploadFile = File(..., description="The image file to detect"),
  confidence_threshold: float = Query(
    default=0.3,
    description="The confidence threshold for the detection"
  ),
):
  start_time = time.perf_counter()
  
  if not file.content_type or not file.content_type.startswith('image/'):
    logger.warning(f"API: Invalid file type: {file.content_type}")
    raise HTTPException(
      status_code=415,
      detail="Invalid file type"
    )
    
  try:
    
    image_bytes = await file.read()
    if not image_bytes:
      logger.warning("API: Empty image file")
      raise HTTPException(
        status_code=400,
        detail="Empty image file"
      )
      
    conf_thresh = confidence_threshold if confidence_threshold is not None else settings.DEFAULT_CONFIDENCE_THRESHOLD
    
    all_raw_detections = detector.detect(image_bytes=image_bytes, confidence_threshold=conf_thresh)
    
  except ValueError as e:
    logger.error(f"API: Error during detection: {e}")
    raise HTTPException(
      status_code=500,
      detail=str(e)
    )
    
  finally:
    await file.close()
  
  relevant_warnings: list[DetectionResult] = []
  all_parsed_detections: list[DetectionResult] = []
  
  for det_data in all_raw_detections:
    try:
      det_obj = DetectionResult(**det_data)
      all_parsed_detections.append(det_obj)
      
      if det_obj.class_name in settings.RELEVANT_TRAFFIC_CLASSES:
        relevant_warnings.append(det_obj)
        
    except Exception as e:
      logger.error(f"API: Error parsing detection result: {e}")
      
  end_time = time.perf_counter()
  processing_time = end_time - start_time
  
  message = "Success"
  if not all_parsed_detections:
    message = "No relevant traffic warnings detected"
  elif not relevant_warnings:
    message = "No relevant traffic warnings detected"
  print("ALL PARSED DETECTIONS", all_parsed_detections)
  return TrafficWarningResponse(
    message=message,
    warnings=all_parsed_detections,
    processing_time_ms=processing_time * 1000,
  )

@router.websocket("/ws/detect")
async def websocket_detect_traffic_warning(
    websocket: WebSocket,
):
    await websocket.accept()
    client_id = f"{websocket.client.host}:{websocket.client.port}"
    print(f"WebSocket connection established for client: {client_id}")
    
    # load detector
    try:
      detector: YOLODetector = websocket.app.state.detector
      if detector is None or not isinstance(detector, YOLODetector):
        raise AttributeError("Detector không tìm thấy hoặc không hợp lệ trong app state")
    except AttributeError as e:
        logger.error(f"WebSocket: Không tìm thấy Detector trong app.state. Đóng kết nối. Lỗi: {e}")
        await websocket.close(code=1011, reason="Dịch vụ model không khả dụng") 
        return
      
    try:
        while True:
            # Receive the image data from the client
            data = await websocket.receive_text()
            try:
                # Parse the JSON data containing image and confidence threshold
                request_data = json.loads(data)
                image_base64 = request_data.get('image')
                confidence_threshold = request_data.get('confidence_threshold', 0.3)
                
                if not image_base64:
                    await websocket.send_json({
                        "error": "No image data provided"
                    })
                    continue
                
                # Decode base64 image
                try:
                    image_bytes = base64.b64decode(image_base64)
                except Exception as e:
                    await websocket.send_json({
                        "error": f"Invalid image data: {str(e)}"
                    })
                    continue
                
                start_time = time.perf_counter()
                
                # Perform detection
                all_raw_detections = detector.detect(
                    image_bytes=image_bytes, 
                    confidence_threshold=confidence_threshold
                )
                
                print("ALL RAW DETECTIONS", all_raw_detections)
                relevant_warnings: list[DetectionResult] = []
                all_parsed_detections: list[DetectionResult] = []
                
                for det_data in all_raw_detections:
                    try:
                        det_obj = DetectionResult(**det_data)
                        all_parsed_detections.append(det_obj)
                        
                        if det_obj.class_name in settings.RELEVANT_TRAFFIC_CLASSES:
                            relevant_warnings.append(det_obj)
                            
                    except Exception as e:
                        logger.error(f"API: Error parsing detection result: {e}")
                
                end_time = time.perf_counter()
                processing_time = end_time - start_time
                
                message = "Success"
                if not all_parsed_detections:
                    message = "No relevant traffic warnings detected"
                elif not relevant_warnings:
                    message = "No relevant traffic warnings detected"
                
                # Send the response back to the client
                response = TrafficWarningResponse(
                    message=message,
                    warnings=all_parsed_detections,
                    processing_time_ms=processing_time * 1000,
                )
                
                try:
                    await websocket.send_json(response.model_dump()) 
                except (ConnectionClosed, ConnectionClosedOK, ConnectionClosedError) as e:
                    logger.warning(f"WebSocket {client_id}: Client disconnected before message could be sent. Error: {e}")
                    break 
                except RuntimeError as e: # Thường là "Cannot call send after close"
                    logger.warning(f"WebSocket {client_id}: Cannot send message, connection might be closing or closed. Error: {e}")
                    break 
                  
            except json.JSONDecodeError:
                await websocket.send_json({
                    "error": "Invalid JSON data"
                })
            except Exception as e:
                logger.error(f"API: Error during detection: {e}")
                await websocket.send_json({
                    "error": str(e)
                })
                
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if websocket.client_state != WebSocketState.DISCONNECTED:
            await websocket.close()
            
# health for websocket

  