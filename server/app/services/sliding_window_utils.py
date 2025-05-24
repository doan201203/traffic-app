import numpy as np
import cv2
from typing import List, Dict, Any, Tuple
import math

def sliding_window_inference(
    image_bytes: bytes,
    window_size: Tuple[int, int] = (160, 160),
    stride: int = 80,
    detector_func: callable = None,
    confidence_threshold: float = 0.3
) -> Tuple[List[np.ndarray], Tuple[int, int], List[Tuple[int, int]]]:
    """
    Apply sliding window approach to an image for object detection.
    
    Args:
        image_bytes: Input image as bytes
        window_size: Size of each sliding window (width, height)
        stride: Step size for sliding window (pixels)
        detector_func: Function to call for detection on each window
        confidence_threshold: Minimum confidence for detections
    
    Returns:
        Tuple of:
            - List of numpy arrays representing image windows
            - Original image size (width, height)
            - List of top-left corner coordinates for each window
    """
    # Read image from bytes
    try:
        img_array = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image")
    except Exception as e:
        raise ValueError(f"Error reading image: {e}")
    
    height, width = img.shape[:2]
    original_size = (width, height)
    
    windows = []
    coordinates = []
    
    # Calculate number of windows in each dimension
    y_positions = list(range(0, height - window_size[1] + 1, stride))
    x_positions = list(range(0, width - window_size[0] + 1, stride))
    
    # Ensure we cover the entire image by adding edge windows if needed
    if y_positions[-1] + window_size[1] < height:
        y_positions.append(height - window_size[1])
    if x_positions[-1] + window_size[0] < width:
        x_positions.append(width - window_size[0])
    
    for y_start in y_positions:
        for x_start in x_positions:
            # Extract window
            y_end = min(y_start + window_size[1], height)
            x_end = min(x_start + window_size[0], width)
            
            window = img[y_start:y_end, x_start:x_end]
            
            # Pad window if it's smaller than expected (edge cases)
            if window.shape[0] < window_size[1] or window.shape[1] < window_size[0]:
                padded_window = np.zeros((window_size[1], window_size[0], 3), dtype=np.uint8)
                padded_window[:window.shape[0], :window.shape[1], :] = window
                window = padded_window
            
            windows.append(window)
            coordinates.append((x_start, y_start))
    
    print(f"Generated {len(windows)} sliding windows with stride {stride}")
    return windows, original_size, coordinates

def combine_sliding_window_detections(
    window_detections: List[List[Dict[str, Any]]],
    window_coordinates: List[Tuple[int, int]],
    original_size: Tuple[int, int],
    iou_threshold: float = 0.5
) -> List[Dict[str, Any]]:
    """
    Combine detections from multiple sliding windows and apply class-agnostic NMS.
    
    Args:
        window_detections: List of detection results for each window
        window_coordinates: List of coordinates (top-left corner) for each window
        original_size: Original image size (width, height)
        iou_threshold: IoU threshold for NMS (class-agnostic)
    
    Returns:
        Combined list of detections after class-agnostic NMS
    """
    all_detections = []
    
    # Adjust bounding box coordinates based on window position
    for detections, (window_x, window_y) in zip(window_detections, window_coordinates):
        for detection in detections:
            x1, y1, x2, y2 = detection["box"]
            
            # Adjust coordinates to original image space
            adjusted_detection = detection.copy()
            adjusted_detection["box"] = [
                x1 + window_x,  # Adjust x1
                y1 + window_y,  # Adjust y1
                x2 + window_x,  # Adjust x2
                y2 + window_y   # Adjust y2
            ]
            all_detections.append(adjusted_detection)
    
    # Apply class-agnostic non-maximum suppression
    return class_agnostic_nms(all_detections, iou_threshold)

def class_agnostic_nms(detections: List[Dict[str, Any]], iou_threshold: float = 0.5) -> List[Dict[str, Any]]:
    """
    Perform class-agnostic Non-Maximum Suppression on detections.
    Unlike traditional NMS, this doesn't group by class - all detections compete against each other.
    
    Args:
        detections: List of detection dictionaries with 'box', 'confidence', and 'class_name'
        iou_threshold: IoU threshold for determining duplicates
    
    Returns:
        List of detections after class-agnostic NMS
    """
    if not detections:
        return []
    
    # Sort all detections by confidence (descending)
    sorted_detections = sorted(detections, key=lambda x: x["confidence"], reverse=True)
    
    final_detections = []
    
    while sorted_detections:
        # Take the detection with highest confidence
        best_detection = sorted_detections.pop(0)
        final_detections.append(best_detection)
        
        # Remove all detections with high IoU with the best detection
        # regardless of class
        remaining_detections = []
        for detection in sorted_detections:
            iou = calculate_iou(best_detection["box"], detection["box"])
            if iou < iou_threshold:
                remaining_detections.append(detection)
        
        sorted_detections = remaining_detections
    
    return final_detections

def calculate_iou(box1: List[float], box2: List[float]) -> float:
    """
    Calculate IoU (Intersection over Union) between two bounding boxes.
    
    Args:
        box1: First bounding box [x1, y1, x2, y2]
        box2: Second bounding box [x1, y1, x2, y2]
    
    Returns:
        IoU value between 0 and 1
    """
    # Calculate intersection area
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])
    
    # Check if there's an intersection
    if x2 <= x1 or y2 <= y1:
        return 0.0
    
    intersection_area = (x2 - x1) * (y2 - y1)
    
    # Calculate union area
    box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
    box2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union_area = box1_area + box2_area - intersection_area
    
    # Calculate IoU
    if union_area == 0:
        return 0.0
    return intersection_area / union_area

def window_to_bytes(window: np.ndarray) -> bytes:
    """
    Convert OpenCV image window to bytes.
    
    Args:
        window: OpenCV image window (numpy array)
    
    Returns:
        Image bytes
    """
    success, encoded_window = cv2.imencode('.jpg', window)
    if not success:
        raise ValueError("Failed to encode window")
    return encoded_window.tobytes()

def visualize_sliding_windows(
    image_bytes: bytes,
    window_size: Tuple[int, int] = (160, 160),
    stride: int = 80,
    output_path: str = None,
    show_coordinates: bool = True
) -> np.ndarray:
    """
    Create a visualization of the image with sliding window grid overlay.
    
    Args:
        image_bytes: Input image as bytes
        window_size: Size of each sliding window (width, height)
        stride: Step size for sliding windows
        output_path: Optional path to save the visualization
        show_coordinates: Whether to show window coordinates
    
    Returns:
        Visualization image with grid lines
    """
    img_array = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    vis_img = img.copy()
    
    height, width = img.shape[:2]
    
    # Get windows and coordinates
    windows, _, coordinates = sliding_window_inference(image_bytes, window_size, stride)
    
    # Colors for different windows (cycling through colors)
    colors = [
        (0, 255, 0),    # Green
        (255, 0, 0),    # Blue (BGR format)
        (0, 0, 255),    # Red
        (255, 255, 0),  # Cyan
        (255, 0, 255),  # Magenta
        (0, 255, 255),  # Yellow
        (128, 0, 128),  # Purple
        (255, 165, 0),  # Orange
    ]
    
    # Draw grid and add window information
    for i, (x_start, y_start) in enumerate(coordinates):
        color = colors[i % len(colors)]
        x_end = min(x_start + window_size[0], width)
        y_end = min(y_start + window_size[1], height)
        
        # Draw rectangle for each window
        cv2.rectangle(vis_img, (x_start, y_start), (x_end, y_end), color, 2)
        
        # Add window number
        cv2.putText(vis_img, f"{i+1}", (x_start+10, y_start+30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                   
        # Add coordinates if requested
        if show_coordinates:
            coord_text = f"({x_start},{y_start})"
            cv2.putText(vis_img, coord_text, (x_start+10, y_start+50), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
    
    # Add legend
    legend_y = 30
    cv2.putText(vis_img, f"Window Size: {window_size[0]}x{window_size[1]}", 
               (10, legend_y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    
    legend_y += 25
    cv2.putText(vis_img, f"Stride: {stride}px", 
               (10, legend_y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    
    legend_y += 25
    cv2.putText(vis_img, f"Total Windows: {len(coordinates)}", 
               (10, legend_y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    
    # Save visualization if output path is provided
    if output_path:
        cv2.imwrite(output_path, vis_img)
        print(f"Sliding window visualization saved to: {output_path}")
    
    return vis_img

def get_sliding_window_stats(
    image_bytes: bytes,
    window_size: Tuple[int, int] = (416, 416),
    stride: int = 80
) -> Dict[str, Any]:
    """
    Get statistics about sliding window configuration for given image.
    
    Args:
        image_bytes: Input image as bytes
        window_size: Size of each sliding window (width, height)
        stride: Step size for sliding windows
    
    Returns:
        Dictionary with statistics about the sliding window setup
    """
    img_array = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    height, width = img.shape[:2]
    
    # Calculate window positions
    y_positions = list(range(0, height - window_size[1] + 1, stride))
    x_positions = list(range(0, width - window_size[0] + 1, stride))
    
    # Add edge windows if needed
    if y_positions[-1] + window_size[1] < height:
        y_positions.append(height - window_size[1])
    if x_positions[-1] + window_size[0] < width:
        x_positions.append(width - window_size[0])
    
    total_windows = len(y_positions) * len(x_positions)
    
    # Calculate overlap percentage
    overlap_x = max(0, window_size[0] - stride) / window_size[0] * 100
    overlap_y = max(0, window_size[1] - stride) / window_size[1] * 100
    
    stats = {
        "image_size": (width, height),
        "window_size": window_size,
        "stride": stride,
        "total_windows": total_windows,
        "windows_per_row": len(x_positions),
        "windows_per_column": len(y_positions),
        "overlap_percentage_x": overlap_x,
        "overlap_percentage_y": overlap_y,
        "coverage_efficiency": (total_windows * window_size[0] * window_size[1]) / (width * height)
    }
    
    return stats