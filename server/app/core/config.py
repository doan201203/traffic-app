from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from typing import Set
import os
class Settings(BaseSettings):
    PROJECT_NAME: str = "Traffic Vision API with PyTorch YOLO" # Cập nhật tên
    API_V1_STR: str = "/api/v1"
    LOG_LEVEL: str = "INFO"

    # Đường dẫn tới model .pt
    MODEL_PATH: Path =  'models_onnx/min.pt'
    DEVICE: str = "cpu" # "cpu", "cuda", "cuda:0", "mps", etc.

    DEFAULT_CONFIDENCE_THRESHOLD: float = 0.25

    RELEVANT_TRAFFIC_CLASSES: Set[str] = {
        "Cấm ngược chiều",
        "Cấm dừng và đỗ",
        "Cấm rẽ",
        "Giới hạn tốc độ",
        "Cấm còn lại",
        "Nguy hiểm",
        "Hiệu lệnh"
    }

    IMAGE_SIZE: int = 1024
    REISZE_FOR_DETECTION: tuple = (480, 480)  # Resize images for detection
    # resize_for_detection
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8', extra='ignore')

settings = Settings()
print("CONFIG DEBUG MODEL_PATH:", settings.MODEL_PATH)