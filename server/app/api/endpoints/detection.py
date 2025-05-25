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
from app.core.config import settings
from app.services.image_tiling_utils import (
  tile_image, 
  combine_tile_detections, 
  tile_to_bytes,
  visualize_tiling,
  crop_image
)
from app.services.sliding_window_utils import (
  sliding_window_inference,
  combine_sliding_window_detections,
  class_agnostic_nms,
  visualize_sliding_windows,
  window_to_bytes,
  get_sliding_window_stats
)
from app.services.image_cropping_utils import (
  crop_image_percentage,
  crop_image_coordinates,
  crop_image_center,
  resize_image_to_square
)

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
  summary="Detect frame with sliding window", 
)
async def detect_traffic_warning(
  detector: YOLODetector = Depends(get_detector),
  file: UploadFile = File(..., description="The image file to detect"),
  confidence_threshold: float = Query(
    default=0.3,
    description="The confidence threshold for the detection"
  ),
  window_size: str = Query(
    default="416,416",
    description="Size of sliding window in width,height format"
  ),
  stride: int = Query(
    default=80,
    description="Stride for sliding window (step size in pixels)"
  ),
  nms_threshold: float = Query(
    default=0.45,
    description="IoU threshold for class-agnostic NMS"
  ),
  visualize: bool = Query(
    default=False,
    description="Whether to return visualization with sliding window grid"
  ),
  method: str = Query(
    default="sliding_window",
    description="Detection method: 'sliding_window', 'tiling', or 'both'"
  ),
  crop_left: float = Query(
    default=0.25,
    description="Percentage to crop from left side (0.0-1.0)"
  ),
  crop_bottom: float = Query(
    default=0.25,
    description="Percentage to crop from bottom (0.0-1.0)"
  ),
  resize_to_square: bool = Query(
    default=True,
    description="Resize input image to square before cropping"
  ),
  target_size: int = Query(
    default=640,
    description="Target square size for resize (e.g., 640 for 640x640)"
  ),
  maintain_aspect_ratio: bool = Query(
    default=True,
    description="Maintain aspect ratio when resizing (adds padding)"
  )
):
  start_time = time.perf_counter()
  
  if not file.content_type or not file.content_type.startswith('image/'):
    logger.warning(f"API: Invalid file type: {file.content_type}")
    raise HTTPException(
      status_code=415,
      detail="Invalid file type"
    )
    
  try:
    # Parse window size
    try:
      w_size = tuple(map(int, window_size.split(',')))
      if len(w_size) != 2:
        raise ValueError("Window size must be in format width,height")
    except ValueError as e:
      logger.error(f"API: Invalid window size: {e}")
      raise HTTPException(
        status_code=400,
        detail=f"Invalid window size: {e}"
      )
    
    image_bytes = await file.read()
    if not image_bytes:
      logger.warning("API: Empty image file")
      raise HTTPException(
        status_code=400,
        detail="Empty image file"
      )
      
    # Resize and crop image using the enhanced utilities
    logger.info(f"Processing image: resize_to_square={resize_to_square}, target_size={target_size}, maintain_aspect_ratio={maintain_aspect_ratio}")
    
    if resize_to_square:
      # First resize to square
      resized_image_bytes = resize_image_to_square(
        image_bytes, 
        target_size=target_size,
        maintain_aspect_ratio=maintain_aspect_ratio
      )
      logger.info(f"Resized image to {target_size}x{target_size}")
      
      # Then crop if needed
      if crop_left > 0 or crop_bottom > 0:
        cropped_image_bytes = crop_image_percentage(
          resized_image_bytes, 
          left_crop_percent=crop_left, 
          bottom_crop_percent=crop_bottom,
          resize_to_square=False  # Already resized
        )
      else:
        cropped_image_bytes = resized_image_bytes
    else:
      # Just crop without resizing
      cropped_image_bytes = crop_image_percentage(
        image_bytes, 
        left_crop_percent=crop_left, 
        bottom_crop_percent=crop_bottom,
        resize_to_square=False
      )
    
    conf_thresh = confidence_threshold if confidence_threshold is not None else settings.DEFAULT_CONFIDENCE_THRESHOLD
    
    all_raw_detections = []
    
    if method == "sliding_window" or method == "both":
      logger.info(f"Using sliding window detection with stride {stride}")
      
      # Create visualization if requested
      if visualize:
        visualize_sliding_windows(
          image_bytes=cropped_image_bytes,
          window_size=w_size,
          stride=stride,
          output_path="sliding_window_visualization.jpg"
        )
        
        # Get and log statistics
        stats = get_sliding_window_stats(cropped_image_bytes, w_size, stride)
        logger.info(f"Sliding window stats: {stats}")
      
      # Apply sliding window inference
      windows, original_size, window_coordinates = sliding_window_inference(
        image_bytes=cropped_image_bytes,
        window_size=w_size,
        stride=stride
      )
      
      # Process each window
      all_window_detections = []
      for i, window in enumerate(windows):
        # Convert window to bytes for detector
        window_bytes = window_to_bytes(window)
        # Detect objects in the window
        window_detections = detector.detect(
          image_bytes=window_bytes, 
          confidence_threshold=conf_thresh,
          imgsz=w_size
        )
        all_window_detections.append(window_detections)
        
        if window_detections:
          logger.debug(f"Window {i+1}: Found {len(window_detections)} detections")
      
      # Combine detections from all windows with class-agnostic NMS
      sliding_detections = combine_sliding_window_detections(
        window_detections=all_window_detections,
        window_coordinates=window_coordinates,
        original_size=original_size,
        iou_threshold=nms_threshold
      )
      
      all_raw_detections.extend(sliding_detections)
      logger.info(f"Sliding window: {len(sliding_detections)} detections after class-agnostic NMS")
    
    if method == "tiling" or method == "both":
      logger.info(f"Using tiling detection with tile size {w_size}")
      
      # Create tiling visualization if requested and not already done
      if visualize and method != "both":
        visualize_tiling(
          image_bytes=cropped_image_bytes,
          tile_size=w_size,
          output_path="tiling_visualization.jpg"
        )
      
      # Split image into tiles
      tiles, original_size, tile_coordinates = tile_image(
        image_bytes=cropped_image_bytes,
        tile_size=w_size
      )
      
      # Process each tile
      all_tile_detections = []
      for tile in tiles:
        # Convert tile to bytes for detector
        tile_bytes = tile_to_bytes(tile)
        # Detect objects in the tile
        tile_detections = detector.detect(
          image_bytes=tile_bytes, 
          confidence_threshold=conf_thresh,
          imgsz=(tile.shape[1], tile.shape[0])
        )
        all_tile_detections.append(tile_detections)
      
      # Combine detections from all tiles
      tiling_detections = combine_tile_detections(
        tile_detections=all_tile_detections,
        tile_coordinates=tile_coordinates,
        original_size=original_size,
        iou_threshold=nms_threshold
      )
      
      all_raw_detections.extend(tiling_detections)
      logger.info(f"Tiling: {len(tiling_detections)} detections after NMS")
    
    # If using both methods, apply final class-agnostic NMS to combined results
    if method == "both":
      logger.info("Applying final class-agnostic NMS to combined sliding window + tiling results")
      all_raw_detections = class_agnostic_nms(all_raw_detections, nms_threshold)
      logger.info(f"Combined methods: {len(all_raw_detections)} final detections after class-agnostic NMS")
    
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
                confidence_threshold = request_data.get('confidence_threshold', 0.5)
                window_size = request_data.get('window_size', (160, 160))
                stride = request_data.get('stride', 80)
                nms_threshold = request_data.get('nms_threshold', 0.3)
                visualize = request_data.get('visualize', True)
                method = request_data.get('method', 'sliding_window')
                crop_left = request_data.get('crop_left', 0.25)
                crop_bottom = request_data.get('crop_bottom', 0.25)
                resize_to_square = request_data.get('resize_to_square', True)
                target_size = request_data.get('target_size', 640)
                maintain_aspect_ratio = request_data.get('maintain_aspect_ratio', True)
                
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
                
                # Resize and crop image using enhanced utilities
                if resize_to_square:
                    # First resize to square
                    resized_image_bytes = resize_image_to_square(
                        image_bytes, 
                        target_size=target_size,
                        maintain_aspect_ratio=maintain_aspect_ratio
                    )
                    
                    # Then crop if needed
                    if crop_left > 0 or crop_bottom > 0:
                        cropped_image_bytes = crop_image_percentage(
                            resized_image_bytes, 
                            left_crop_percent=crop_left, 
                            bottom_crop_percent=crop_bottom,
                            resize_to_square=False  # Already resized
                        )
                    else:
                        cropped_image_bytes = resized_image_bytes
                else:
                    # Just crop without resizing
                    cropped_image_bytes = crop_image_percentage(
                        image_bytes, 
                        left_crop_percent=crop_left, 
                        bottom_crop_percent=crop_bottom,
                        resize_to_square=False
                    )
                
                all_raw_detections = []
                
                if method == "sliding_window" or method == "both":
                  # Create visualization if requested
                  if visualize:
                    visualize_sliding_windows(
                      image_bytes=cropped_image_bytes,
                      window_size=window_size,
                      stride=stride,
                      output_path="sliding_window_visualization_ws.jpg"
                    )
                  
                  # Apply sliding window inference
                  windows, original_size, window_coordinates = sliding_window_inference(
                    image_bytes=cropped_image_bytes,
                    window_size=window_size,
                    stride=stride
                  )
                  
                  # Process each window
                  all_window_detections = []
                  for window in windows:
                    # Convert window to bytes for detector
                    window_bytes = window_to_bytes(window)
                    # Detect objects in the window
                    window_detections = detector.detect(
                        image_bytes=window_bytes, 
                        confidence_threshold=confidence_threshold,
                        imgsz=window_size,
                    )
                    all_window_detections.append(window_detections)
                  
                  # Combine detections from all windows with class-agnostic NMS
                  sliding_detections = combine_sliding_window_detections(
                    window_detections=all_window_detections,
                    window_coordinates=window_coordinates,
                    original_size=original_size,
                    iou_threshold=nms_threshold
                  )
                  
                  all_raw_detections.extend(sliding_detections)
                
                if method == "tiling" or method == "both":
                  # Create tiling visualization if requested
                  if visualize and method != "both":
                    visualize_tiling(
                      image_bytes=cropped_image_bytes,
                      tile_size=window_size,
                      output_path="tiling_visualization_ws.jpg"
                    )
                  
                  # Split image into tiles
                  tiles, original_size, tile_coordinates = tile_image(
                    image_bytes=cropped_image_bytes,
                    tile_size=window_size
                  )
                  
                  # Process each tile
                  all_tile_detections = []
                  for tile in tiles:
                    # Convert tile to bytes for detector
                    tile_bytes = tile_to_bytes(tile)
                    # Detect objects in the tile
                    tile_detections = detector.detect(
                        image_bytes=tile_bytes, 
                        confidence_threshold=confidence_threshold,
                        imgsz=(tile.shape[1], tile.shape[0]),
                    )
                    all_tile_detections.append(tile_detections)
                  
                  # Combine detections from all tiles
                  tiling_detections = combine_tile_detections(
                    tile_detections=all_tile_detections,
                    tile_coordinates=tile_coordinates,
                    original_size=original_size,
                    iou_threshold=nms_threshold
                  )
                  
                  all_raw_detections.extend(tiling_detections)
                
                # If using both methods, apply final class-agnostic NMS
                if method == "both":
                  all_raw_detections = class_agnostic_nms(all_raw_detections, nms_threshold)
                
                print("all_raw_detections", all_raw_detections)
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

@router.get("/health-ws")
async def health_check_ws():
    return {"status": "ok", "service": "image-sliding-window-detection-ws"}

@router.post("/window-stats")
async def get_window_statistics(
    file: UploadFile = File(..., description="The image file to analyze"),
    window_size: str = Query(
        default="416,416",
        description="Size of sliding window in width,height format"
    ),
    stride: int = Query(
        default=80,
        description="Stride for sliding window (step size in pixels)"
    ),
    crop_left: float = Query(
        default=0.25,
        description="Percentage to crop from left side (0.0-1.0)"
    ),
    crop_bottom: float = Query(
        default=0.25,
        description="Percentage to crop from bottom (0.0-1.0)"
    )
):
    """Get sliding window statistics for an image without running detection."""
    
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=415,
            detail="Invalid file type"
        )
    
    try:
        # Parse window size
        try:
            w_size = tuple(map(int, window_size.split(',')))
            if len(w_size) != 2:
                raise ValueError("Window size must be in format width,height")
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid window size: {e}"
            )
        
        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(
                status_code=400,
                detail="Empty image file"
            )
        
        # Crop image
        cropped_image_bytes = crop_image_percentage(
            image_bytes, 
            left_crop_percent=crop_left, 
            bottom_crop_percent=crop_bottom
        )
        
        # Get window statistics
        stats = get_sliding_window_stats(cropped_image_bytes, w_size, stride)
        
        return {
            "message": "Window statistics calculated successfully",
            "statistics": stats,
            "parameters": {
                "window_size": w_size,
                "stride": stride,
                "crop_left": crop_left,
                "crop_bottom": crop_bottom
            }
        }
        
    except ValueError as e:
        logger.error(f"API: Error calculating window stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
    finally:
        await file.close()

