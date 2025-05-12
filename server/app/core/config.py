from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from typing import Set

class Settings(BaseSettings):
    PROJECT_NAME: str = "Traffic Vision API with PyTorch YOLO" # Cập nhật tên
    API_V1_STR: str = "/api/v1"
    LOG_LEVEL: str = "INFO"

    # Đường dẫn tới model .pt
    MODEL_PATH: Path = Path("/home/trdoan/traffic-app/server/models_onnx/best.onnx") # Absolute path
    # CLASSES_PATH: Path = Path("models_onnx/coco_classes.txt") # Không cần nữa

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

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8', extra='ignore')

settings = Settings()