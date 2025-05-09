from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import logging
import time
from typing import Dict, Any
from pydantic import BaseModel
from utils.config_loader import load_config
from utils.model_loader import load_model
from services.tools import process_sign_detections, get_warnings_text

# Initialize FastAPI app
app = FastAPI(
    title="Traffic Sign Detection API",
    description="API for detecting traffic signs and generating warnings",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load configuration and model
config = load_config()
model = load_model(config['model_path'], config['device'])

# Pydantic models for request/response
class WarningResponse(BaseModel):
    warnings: str
    processing_time: float

@app.get("/")
async def root():
    """Root endpoint to check if API is running"""
    return {
        "status": "running",
        "message": "Traffic Sign Detection API is active",
        "version": "1.0.0"
    }

@app.post("/detect", response_model=WarningResponse)
async def detect_signs(file: UploadFile = File(...)):
    """
    Process an image frame and detect traffic signs.
    Returns only warning text.
    
    Args:
        file: Image file (JPEG, PNG)
        
    Returns:
        WarningResponse containing:
        - warnings: Formatted warning text
        - processing_time: Time taken to process the frame
    """
    try:
        # Read and decode image
        print(file)
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(
                status_code=400,
                detail="Invalid image format. Please provide a valid image file."
            )

        # Process frame
        start_time = time.time()
        
        # Run detection
        results = model.predict(
            source=frame,
            conf=config['inference']['confidence_threshold'],
            device=config['device'],
            verbose=False,
            task='detect',
            imgsz=640,
            classes=list(config['class_names'].keys())
        )

        # Process detections and get warnings
        detections, current_frame_warnings = process_sign_detections(results, config)
        warning_text = get_warnings_text(detections, current_frame_warnings)
        
        # Calculate processing time
        processing_time = time.time() - start_time

        return WarningResponse(
            warnings=warning_text,
            processing_time=processing_time
        )

    except Exception as e:
        logger.error(f"Error processing frame: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing frame: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check if model is loaded
        if model is None:
            return {"status": "error", "message": "Model not loaded"}
            
        # Check if config is loaded
        if config is None:
            return {"status": "error", "message": "Config not loaded"}
            
        return {
            "status": "healthy",
            "model_loaded": model is not None,
            "config_loaded": config is not None
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    
    # Log startup information
    logger.info("Starting Traffic Sign Detection API...")
    logger.info(f"Model path: {config.get('model_path')}")
    logger.info(f"Device: {config.get('device')}")
    logger.info(f"Warning trigger IDs: {config.get('warning_trigger_sign_ids')}")
    
    # Run the API
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
