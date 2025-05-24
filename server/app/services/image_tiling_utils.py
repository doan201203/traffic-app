import numpy as np
import cv2
from typing import List, Dict, Any, Tuple
import io
from PIL import Image
import math

def crop_image(image_bytes: bytes, left_crop_percent: float = 0.3, bottom_crop_percent: float = 0.3) -> bytes:
    """
    Crop an image by removing specified percentages from the left and bottom.
    
    Args:
        image_bytes: Input image as bytes
        left_crop_percent: Percentage of image width to remove from left (0.0-1.0)
        bottom_crop_percent: Percentage of image height to remove from bottom (0.0-1.0)
    
    Returns:
        Bytes of the cropped image
    """
    # Read image from bytes
    try:
        img_array = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image")
    except Exception as e:
        raise ValueError(f"Error reading image: {e}")
    
    # Get image dimensions
    height, width = img.shape[:2]
    print(f"Original image size: {width}x{height}")
    # Calculate crop coordinates
    left_crop = int(width * left_crop_percent)
    bottom_crop = int(height * bottom_crop_percent)
    
    # Crop the image (remove left_crop from left, and bottom_crop from bottom)
    # Format is img[y_start:y_end, x_start:x_end]
    cropped_img = img[0:height-bottom_crop, left_crop:width]
    
    # Convert back to bytes
    success, encoded_img = cv2.imencode('.jpg', cropped_img)
    if not success:
        raise ValueError("Failed to encode cropped image")
    
    return encoded_img.tobytes()

def tile_image(
    image_bytes: bytes,
    tile_size: Tuple[int, int] = (416, 416),
) -> Tuple[List[np.ndarray], Tuple[int, int], List[Tuple[int, int]]]:
    """
    Split an image into non-overlapping tiles.
    
    Args:
        image_bytes: Input image as bytes
        tile_size: Size of each tile (width, height)
    
    Returns:
        Tuple of:
            - List of numpy arrays representing image tiles
            - Original image size (width, height)
            - List of top-left corner coordinates for each tile
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
    
    # Calculate number of tiles in each dimension
    n_tiles_w = math.ceil(width / tile_size[0])
    n_tiles_h = math.ceil(height / tile_size[1])
    
    tiles = []
    coordinates = []
    
    for y in range(n_tiles_h):
        for x in range(n_tiles_w):
            # Calculate tile coordinates
            x_start = x * tile_size[0]
            y_start = y * tile_size[1]
            
            x_end = min(x_start + tile_size[0], width)
            y_end = min(y_start + tile_size[1], height)
            
            # Handle edge tiles (which might be smaller than tile_size)
            tile = img[y_start:y_end, x_start:x_end]
            
            # If the tile is smaller than tile_size, pad it
            if tile.shape[0] < tile_size[1] or tile.shape[1] < tile_size[0]:
                padded_tile = np.zeros((tile_size[1], tile_size[0], 3), dtype=np.uint8)
                padded_tile[:tile.shape[0], :tile.shape[1], :] = tile
                tile = padded_tile
            tiles.append(tile)
            coordinates.append((x_start, y_start))
    print(coordinates)
    return tiles, original_size, coordinates

def combine_tile_detections(
    tile_detections: List[List[Dict[str, Any]]],
    tile_coordinates: List[Tuple[int, int]],
    original_size: Tuple[int, int],
    iou_threshold: float = 0.45
) -> List[Dict[str, Any]]:
    """
    Combine detections from multiple tiles and apply NMS.
    
    Args:
        tile_detections: List of detection results for each tile
        tile_coordinates: List of coordinates (top-left corner) for each tile
        original_size: Original image size (width, height)
        iou_threshold: IoU threshold for NMS
    
    Returns:
        Combined list of detections after NMS
    """
    all_detections = []
    
    # Adjust bounding box coordinates based on tile position
    for detections, (tile_x, tile_y) in zip(tile_detections, tile_coordinates):
        for detection in detections:
            x1, y1, x2, y2 = detection["box"]
            
            # Adjust coordinates to original image space
            adjusted_detection = detection.copy()
            adjusted_detection["box"] = [
                x1 + tile_x,  # Adjust x1
                y1 + tile_y,  # Adjust y1
                x2 + tile_x,  # Adjust x2
                y2 + tile_y,  # Adjust y2
            ]
            all_detections.append(adjusted_detection)
    
    # Apply non-maximum suppression
    return non_max_suppression(all_detections, iou_threshold)

def non_max_suppression(detections: List[Dict[str, Any]], iou_threshold: float = 0.45) -> List[Dict[str, Any]]:
    """
    Perform Non-Maximum Suppression on detections.
    
    Args:
        detections: List of detection dictionaries with 'bbox', 'confidence', and 'class_name'
        iou_threshold: IoU threshold for determining duplicates
    
    Returns:
        List of detections after NMS
    """
    if not detections:
        return []
    
    # Sort detections by confidence
    sorted_detections = sorted(detections, key=lambda x: x["confidence"], reverse=True)
    
    # Group detections by class_name
    class_detections = {}
    for det in sorted_detections:
        class_name = det["class_name"]
        if class_name not in class_detections:
            class_detections[class_name] = []
        class_detections[class_name].append(det)
    
    # Apply NMS for each class separately
    final_detections = []
    for class_name, dets in class_detections.items():
        while dets:
            best_detection = dets.pop(0)
            final_detections.append(best_detection)
            
            # Filter out detections with high IoU
            dets = [
                det for det in dets
                if calculate_iou(best_detection["box"], det["box"]) < iou_threshold
            ]
    
    return final_detections

def calculate_iou(box1: List[float], box2: List[float]) -> float:
    """
    Calculate IoU (Intersection over Union) between two bounding boxes.
    
    Args:
        box1: First bounding box [x1, y1, x2, y2]
        box2: Second bounding box [x1, y1, x2, y2]
    
    Returns:
        IoU value
    """
    # Calculate intersection area
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])
    
    intersection_area = max(0, x2 - x1) * max(0, y2 - y1)
    
    # Calculate union area
    box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
    box2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union_area = box1_area + box2_area - intersection_area
    
    # Calculate IoU
    if union_area == 0:
        return 0
    return intersection_area / union_area

def tile_to_bytes(tile: np.ndarray) -> bytes:
    """
    Convert OpenCV image tile to bytes.
    
    Args:
        tile: OpenCV image tile (numpy array)
    
    Returns:
        Image bytes
    """
    success, encoded_tile = cv2.imencode('.jpg', tile)
    if not success:
        raise ValueError("Failed to encode tile")
    return encoded_tile.tobytes()

def visualize_tiling(
    image_bytes: bytes,
    tile_size: Tuple[int, int] = (416, 416),
    output_path: str = None,
    show_coordinates: bool = True
) -> np.ndarray:
    """
    Create a visualization of the image with tiling grid overlay.
    
    Args:
        image_bytes: Input image as bytes
        tile_size: Size of each tile (width, height)
        output_path: Optional path to save the visualization
        show_coordinates: Whether to show tile coordinates
    
    Returns:
        Visualization image with grid lines
    """
    img_array = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    vis_img = img.copy()
    
    height, width = img.shape[:2]
    
    # Get tiles and coordinates
    tiles, _, coordinates = tile_image(image_bytes, tile_size)
    
    # Colors for different tiles
    colors = [
        (0, 255, 0),    # Green
        (255, 0, 0),    # Blue (BGR format)
        (0, 0, 255),    # Red
        (255, 255, 0),  # Cyan
        (255, 0, 255),  # Magenta
        (0, 255, 255),  # Yellow
    ]
    
    # Draw grid and add tile information
    for i, (x_start, y_start) in enumerate(coordinates):
        color = colors[i % len(colors)]
        x_end = min(x_start + tile_size[0], width)
        y_end = min(y_start + tile_size[1], height)
        
        # Draw rectangle for each tile
        cv2.rectangle(vis_img, (x_start, y_start), (x_end, y_end), color, 2)
        
        # Add tile number
        cv2.putText(vis_img, f"{i+1}", (x_start+10, y_start+30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
                   
        # Add coordinates if requested
        if show_coordinates:
            coord_text = f"({x_start},{y_start})"
            cv2.putText(vis_img, coord_text, (x_start+10, y_start+60), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
    
    # Add legend
    legend_y = 30
    cv2.putText(vis_img, f"Tile Size: {tile_size[0]}x{tile_size[1]}", 
               (10, legend_y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    
    legend_y += 25
    cv2.putText(vis_img, f"Total Tiles: {len(coordinates)}", 
               (10, legend_y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    
    # Save visualization if output path is provided
    if output_path:
        cv2.imwrite(output_path, vis_img)
    
    return vis_img