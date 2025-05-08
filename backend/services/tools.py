import cv2
import numpy as np
from typing import Dict, List, Tuple, Any, Optional
from PIL import Image, ImageDraw, ImageFont
import logging
from functools import lru_cache

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
DEFAULT_FONT_PATH = "DejaVuSans.ttf"
DEFAULT_FONT_SIZE = 20
DEFAULT_COLOR = (0, 255, 255)  # Yellow in BGR
WARNING_COLOR = (0, 0, 255)    # Red in BGR
NORMAL_COLOR = (0, 255, 0)     # Green in BGR

@lru_cache(maxsize=1)
def load_font(font_path: str = DEFAULT_FONT_PATH, font_size: int = DEFAULT_FONT_SIZE) -> ImageFont.FreeTypeFont:
    """
    Load and cache the font for text rendering.
    
    Args:
        font_path: Path to the font file
        font_size: Size of the font
        
    Returns:
        PIL ImageFont object
    """
    try:
        return ImageFont.truetype(font_path, font_size)
    except IOError as e:
        logger.warning(f"Failed to load font {font_path}: {e}. Using default font.")
        return ImageFont.load_default()

def process_sign_detections(results: Any, config: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], Dict[int, str]]:
    """
    Process sign detections and identify warnings.
    
    Args:
        results: YOLO detection results
        config: Configuration dictionary containing thresholds and class names
        
    Returns:
        Tuple of (detections list, warnings dictionary)
    """
    detections = []
    current_frame_warnings = {}

    if not results or results[0].boxes is None:
        return detections, current_frame_warnings

    try:
        # Convert tensors to numpy arrays efficiently
        boxes = results[0].boxes.xyxy.cpu().numpy()
        confs = results[0].boxes.conf.cpu().numpy()
        clss = results[0].boxes.cls.cpu().numpy().astype(int)

        # Filter by confidence threshold using boolean indexing
        valid_mask = confs >= config['inference']['confidence_threshold']
        boxes = boxes[valid_mask]
        confs = confs[valid_mask]
        clss = clss[valid_mask]
        
        warning_trigger_ids = set(config.get('warning_trigger_sign_ids', []))
        
        # Process all detections at once
        for box, conf, cls_id in zip(boxes, confs, clss):
            class_name = config['class_names'][cls_id]
            is_warning = cls_id in warning_trigger_ids

            if is_warning:
                warning_message = f"Chú ý: [{class_name}] phía trước! (Độ tin cậy: {float(conf):.2f})"
                current_frame_warnings[cls_id] = warning_message

    except Exception as e:
        logger.error(f"Error processing detections: {e}")
        return [], {}

    return detections, current_frame_warnings

def draw_utf8_text(
    img: np.ndarray,
    text: str,
    position: Tuple[int, int],
    font_scale: float = 0.7,
    color: Tuple[int, int, int] = DEFAULT_COLOR,
    thickness: int = 1
) -> np.ndarray:
    """
    Draw UTF-8 text on image using PIL.
    
    Args:
        img: Input image in BGR format
        text: Text to draw
        position: (x, y) position for text
        font_scale: Scale factor for font size
        color: BGR color tuple
        thickness: Text thickness
        
    Returns:
        Image with text drawn
    """
    try:
        # Convert OpenCV image to PIL format
        pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        draw = ImageDraw.Draw(pil_img)
        
        # Get cached font
        font = load_font(font_size=int(DEFAULT_FONT_SIZE * font_scale))
        
        # Draw text with PIL
        draw.text(position, text, font=font, fill=(color[2], color[1], color[0]))
        
        # Convert back to OpenCV format
        return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        
    except Exception as e:
        logger.error(f"Error drawing text: {e}")
        return img

def annotate_frame_dashcam(
    frame: np.ndarray,
    detections: List[Dict[str, Any]],
    active_warnings: Dict[int, str]
) -> np.ndarray:
    """
    Draw bounding boxes and warnings on frame.
    
    Args:
        frame: Input frame in BGR format
        detections: List of detection dictionaries
        active_warnings: Dictionary of active warnings
        
    Returns:
        Annotated frame
    """
    try:
        # Create a copy of the frame for annotation
        annotated_frame = frame.copy()

        # Draw detections
        for det in detections:
            x1, y1, x2, y2 = det['bbox']
            color = WARNING_COLOR if det["is_warning"] else NORMAL_COLOR
            thickness = 2 if det["is_warning"] else 1
            label = f"{det['class_name']} {det['conf']:.2f}"

            # Draw rectangle
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, thickness)
            
            # Calculate label position
            label_y = y1 - 10 if y1 - 10 > 10 else y1 + 15
            
            # Draw label
            cv2.putText(
                annotated_frame,
                label,
                (x1, label_y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                color,
                thickness
            )

        # Draw warnings
        y_offset = 30
        for msg in active_warnings.values():
            annotated_frame = draw_utf8_text(
                annotated_frame,
                msg,
                (10, y_offset),
                font_scale=0.7,
                color=DEFAULT_COLOR,
                thickness=1
            )
            y_offset += 40  # Increased spacing for better readability

        return annotated_frame

    except Exception as e:
        logger.error(f"Error annotating frame: {e}")
        return frame

def get_warnings_text(detections: List[Dict[str, Any]], active_warnings: Dict[int, str]) -> str:
    """
    Convert warnings to a formatted text string.
    
    Args:
        detections: List of detection dictionaries
        active_warnings: Dictionary of active warnings
        
    Returns:
        Formatted warning text
    """
    if not active_warnings:
        return "Không có cảnh báo nào."

    # Join all warning messages with newlines
    return "\n".join(active_warnings.values())
