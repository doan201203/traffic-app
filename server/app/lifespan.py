# app/lifespan.py
from contextlib import asynccontextmanager
import logging
from core_models.yolo_detector import YOLODetector
from app.core.config import settings

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app):
  logger.info('Starting lifespan')
  
  try:
    detector = YOLODetector(
      model_path="/home/trdoan/traffic-app/server/models_onnx/best.onnx",
      device=settings.DEVICE      
    )
    print("HELLO", settings.MODEL_PATH)
    app.state.detector = detector
    logger.info(f'Tải mô hình thành công: {settings.MODEL_PATH}')
  except Exception as e:
    logger.error(f'Lỗi khi tải mô hình: {e}')
    raise e
  
  yield 
  
  logger.info('Stopping lifespan')
  del app.state.detector
  logger.info('Mô hình đã được giải phóng')

    
