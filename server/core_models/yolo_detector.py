import torch
from ultralytics import YOLO # Sử dụng thư viện ultralytics
from PIL import Image
import io
import logging
import numpy as np # ultralytics results có thể trả về numpy arrays
logger = logging.getLogger(__name__)

class YOLODetector:
  def __init__(self, model_path: str, device: str = 'cpu'):
    self.model_path = model_path
    self.device = device
    self._load_model()

    # Lấy tên class từ model (nếu có)
    self.class_names = self.model.names if hasattr(self.model, 'names') else []
    if not self.class_names:
      logger.warning(f"Could not retrieve class names from the model at {model_path}. Detections will use class_id only for names.")


    logger.info(f"PyTorch YOLO Detector initialized: Model='{model_path}', Device='{self.device}'. "
                  f"Found {len(self.class_names)} classes.")

  def _load_model(self):
    try:
      self.model = YOLO(self.model_path) 
      logger.info(f"Model {self.model_path} loaded successfully on device '{self.device}'.")
    except Exception as e:
      logger.error(f"Failed to load PyTorch YOLO model from {self.model_path} on device '{self.device}': {e}")
      raise

  def detect(self, image_bytes: bytes, confidence_threshold: float = 0.3) -> list[dict]:
    try:
      image_pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
      logger.error(f"Detector: Invalid image format or corrupt image bytes: {e}")
      raise ValueError(f"Invalid image format: {e}")

    try:
      results = self.model.predict(
        source=image_pil,
        conf=confidence_threshold,
        device=self.device,
        imgsz=640,
      )
    except Exception as e:
      logger.error(f"Detector: PyTorch YOLO model inference error: {e}", exc_info=True)
      raise RuntimeError(f"Model inference failed: {e}")

    processed_detections = []
    if results and results[0]: 
      res = results[0] 
      
      boxes_xyxy = res.boxes.xyxy.cpu().tolist()  # [[x1, y1, x2, y2], ...]
      confs = res.boxes.conf.cpu().tolist()    # [conf1, conf2, ...]
      class_ids = res.boxes.cls.cpu().tolist() # [cls1, cls2, ...]


      for i in range(len(boxes_xyxy)):
        box = boxes_xyxy[i]
        confidence = confs[i]
        class_id = int(class_ids[i])

        class_name = self.class_names[class_id] if 0 <= class_id < len(self.class_names) else f"Unknown_{class_id}"
          
        processed_detections.append({
          "box": [float(b) for b in box], 
          "confidence": float(confidence),
          "class_id": class_id,
          "class_name": class_name
        })
    
    return processed_detections
