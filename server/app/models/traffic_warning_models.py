from pydantic import BaseModel, Field
from typing import List, Tuple

class DetectionResult(BaseModel):
    box: Tuple[float, float, float, float] = Field(..., example=[100.0, 150.0, 200.0, 250.0], description="Bounding box coordinates (x1, y1, x2, y2) in original image space.")
    confidence: float = Field(..., example=0.85, ge=0.0, le=1.0, description="Detection confidence score.")
    class_id: int = Field(..., example=0, description="Integer ID of the detected class.")
    class_name: str = Field(..., example="person", description="Name of the detected class.")

class TrafficWarningResponse(BaseModel):
    warnings: List[DetectionResult] = Field(..., description="List of detected traffic warnings.")
    processing_time_ms: float | None = Field(None, example=150.5, description="Optional: Server-side processing time in milliseconds.")
    message: str = Field("Detections processed", description="Status message.")