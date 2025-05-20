# app/lifespan.py
from contextlib import asynccontextmanager
import logging
from core_models.yolo_detector import YOLODetector
from app.core.config import settings
import os 

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app):
  logger.info('Starting lifespan')
  try:
    detector = YOLODetector(
      model_path=settings.MODEL_PATH,
      device=settings.DEVICE      
    )
    app.state.detector = detector
    logger.info(f'Tải mô hình thành công: {settings.MODEL_PATH}')
  except Exception as e:
    logger.error(f'Lỗi khi tải mô hình: {e}')
    raise e
  
  yield 
  
  logger.info('Stopping lifespan')
  del app.state.detector
  logger.info('Mô hình đã được giải phóng')

    
