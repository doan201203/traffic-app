import numpy as np
import cv2
from typing import List, Dict, Any, Tuple, Optional, Union
import io
from PIL import Image
import math

def resize_image_to_square(
    image_bytes: bytes,
    target_size: int = 640,
    maintain_aspect_ratio: bool = True,
    padding_color: Tuple[int, int, int] = (0, 0, 0)
) -> bytes:
    """
    Resize image to a square target size.
    
    Args:
        image_bytes: Input image as bytes
        target_size: Target square size (width and height)
        maintain_aspect_ratio: If True, pad image to maintain aspect ratio
        padding_color: RGB color for padding when maintaining aspect ratio
    
    Returns:
        Bytes of the resized image
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
    print(f"Original image size: {width}x{height}")
    
    if maintain_aspect_ratio:
        # Calculate scaling factor to fit image within target size
        scale = min(target_size / width, target_size / height)
        
        # Calculate new dimensions
        new_width = int(width * scale)
        new_height = int(height * scale)
        
        # Resize image
        resized_img = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_LINEAR)
        
        # Create square canvas with padding
        square_img = np.full((target_size, target_size, 3), padding_color, dtype=np.uint8)
        
        # Calculate padding offsets to center the image
        y_offset = (target_size - new_height) // 2
        x_offset = (target_size - new_width) // 2
        
        # Place resized image in center of square canvas
        square_img[y_offset:y_offset+new_height, x_offset:x_offset+new_width] = resized_img
        
        print(f"Resized with aspect ratio: {new_width}x{new_height} -> {target_size}x{target_size} (padded)")
        
    else:
        # Simple resize without maintaining aspect ratio
        square_img = cv2.resize(img, (target_size, target_size), interpolation=cv2.INTER_LINEAR)
        print(f"Resized without aspect ratio: {width}x{height} -> {target_size}x{target_size}")
    
    # Convert back to bytes
    success, encoded_img = cv2.imencode('.jpg', square_img)
    if not success:
        raise ValueError("Failed to encode resized image")
    
    return encoded_img.tobytes()

def crop_image_percentage(
    image_bytes: bytes, 
    left_crop_percent: float = 0.0, 
    right_crop_percent: float = 0.0,
    top_crop_percent: float = 0.0,
    bottom_crop_percent: float = 0.0,
    resize_to_square: bool = True,
    target_size: int = 640
) -> bytes:
    """
    Crop an image by removing specified percentages from each side.
    Optionally resize to square before cropping.
    
    Args:
        image_bytes: Input image as bytes
        left_crop_percent: Percentage of image width to remove from left (0.0-1.0)
        right_crop_percent: Percentage of image width to remove from right (0.0-1.0)
        top_crop_percent: Percentage of image height to remove from top (0.0-1.0)
        bottom_crop_percent: Percentage of image height to remove from bottom (0.0-1.0)
        resize_to_square: Whether to resize to square before cropping
        target_size: Target square size if resize_to_square is True
    
    Returns:
        Bytes of the cropped image
    """
    # Resize to square first if requested
    if resize_to_square:
        print(f"Resizing image to {target_size}x{target_size} before cropping")
        image_bytes = resize_image_to_square(image_bytes, target_size)
    
    # Read image from bytes
    try:
        img_array = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image")
    except Exception as e:
        raise ValueError(f"Error reading image: {e}")
    
    height, width = img.shape[:2]
    print(f"Image size before cropping: {width}x{height}")
    
    # Calculate crop coordinates
    left_crop = int(width * left_crop_percent)
    right_crop = int(width * right_crop_percent)
    top_crop = int(height * top_crop_percent)
    bottom_crop = int(height * bottom_crop_percent)
    
    # Validate crop dimensions
    if left_crop + right_crop >= width or top_crop + bottom_crop >= height:
        raise ValueError("Crop percentages would result in zero or negative image size")
    
    # Crop the image
    cropped_img = img[top_crop:height-bottom_crop, left_crop:width-right_crop]
    
    print(f"Cropped image size: {cropped_img.shape[1]}x{cropped_img.shape[0]}")
    print(f"Removed: left={left_crop}px, right={right_crop}px, top={top_crop}px, bottom={bottom_crop}px")
    
    # Convert back to bytes
    success, encoded_img = cv2.imencode('.jpg', cropped_img)
    if not success:
        raise ValueError("Failed to encode cropped image")
    
    return encoded_img.tobytes()

def crop_image_coordinates(
    image_bytes: bytes,
    x1: int, y1: int, x2: int, y2: int
) -> bytes:
    """
    Crop an image using absolute coordinates.
    
    Args:
        image_bytes: Input image as bytes
        x1: Left coordinate
        y1: Top coordinate  
        x2: Right coordinate
        y2: Bottom coordinate
    
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
    
    height, width = img.shape[:2]
    
    # Validate coordinates
    x1 = max(0, min(x1, width))
    y1 = max(0, min(y1, height))
    x2 = max(x1, min(x2, width))
    y2 = max(y1, min(y2, height))
    
    if x2 <= x1 or y2 <= y1:
        raise ValueError("Invalid crop coordinates")
    
    print(f"Original image size: {width}x{height}")
    print(f"Cropping coordinates: ({x1}, {y1}) to ({x2}, {y2})")
    
    # Crop the image
    cropped_img = img[y1:y2, x1:x2]
    
    print(f"Cropped image size: {cropped_img.shape[1]}x{cropped_img.shape[0]}")
    
    # Convert back to bytes
    success, encoded_img = cv2.imencode('.jpg', cropped_img)
    if not success:
        raise ValueError("Failed to encode cropped image")
    
    return encoded_img.tobytes()

def crop_image_center(
    image_bytes: bytes,
    crop_width: int,
    crop_height: int
) -> bytes:
    """
    Crop an image from the center to specified dimensions.
    
    Args:
        image_bytes: Input image as bytes
        crop_width: Desired width of cropped image
        crop_height: Desired height of cropped image
    
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
    
    height, width = img.shape[:2]
    
    # Validate dimensions
    if crop_width > width or crop_height > height:
        raise ValueError("Crop dimensions larger than original image")
    
    # Calculate center crop coordinates
    center_x = width // 2
    center_y = height // 2
    
    x1 = center_x - crop_width // 2
    y1 = center_y - crop_height // 2
    x2 = x1 + crop_width
    y2 = y1 + crop_height
    
    print(f"Original image size: {width}x{height}")
    print(f"Center cropping to: {crop_width}x{crop_height}")
    print(f"Crop coordinates: ({x1}, {y1}) to ({x2}, {y2})")
    
    # Crop the image
    cropped_img = img[y1:y2, x1:x2]
    
    # Convert back to bytes
    success, encoded_img = cv2.imencode('.jpg', cropped_img)
    if not success:
        raise ValueError("Failed to encode cropped image")
    
    return encoded_img.tobytes()

def crop_image_multiple_regions(
    image_bytes: bytes,
    regions: List[Tuple[int, int, int, int]]
) -> List[bytes]:
    """
    Crop multiple regions from a single image.
    
    Args:
        image_bytes: Input image as bytes
        regions: List of tuples (x1, y1, x2, y2) for each crop region
    
    Returns:
        List of bytes for each cropped region
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
    cropped_images = []
    
    print(f"Original image size: {width}x{height}")
    print(f"Cropping {len(regions)} regions")
    
    for i, (x1, y1, x2, y2) in enumerate(regions):
        # Validate coordinates
        x1 = max(0, min(x1, width))
        y1 = max(0, min(y1, height))
        x2 = max(x1, min(x2, width))
        y2 = max(y1, min(y2, height))
        
        if x2 <= x1 or y2 <= y1:
            print(f"Warning: Skipping invalid region {i+1}: ({x1}, {y1}) to ({x2}, {y2})")
            continue
        
        # Crop the region
        cropped_img = img[y1:y2, x1:x2]
        
        print(f"Region {i+1}: ({x1}, {y1}) to ({x2}, {y2}) -> {cropped_img.shape[1]}x{cropped_img.shape[0]}")
        
        # Convert to bytes
        success, encoded_img = cv2.imencode('.jpg', cropped_img)
        if success:
            cropped_images.append(encoded_img.tobytes())
        else:
            print(f"Warning: Failed to encode region {i+1}")
    
    return cropped_images

def crop_image_grid(
    image_bytes: bytes,
    grid_rows: int,
    grid_cols: int,
    overlap_percent: float = 0.0
) -> Tuple[List[bytes], List[Tuple[int, int, int, int]]]:
    """
    Crop image into a grid of regions with optional overlap.
    
    Args:
        image_bytes: Input image as bytes
        grid_rows: Number of rows in the grid
        grid_cols: Number of columns in the grid
        overlap_percent: Percentage overlap between adjacent crops (0.0-0.5)
    
    Returns:
        Tuple of:
            - List of bytes for each cropped region
            - List of coordinates (x1, y1, x2, y2) for each region
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
    
    # Calculate grid dimensions
    overlap = max(0.0, min(0.5, overlap_percent))  # Clamp overlap
    
    # Calculate step sizes accounting for overlap
    step_width = width / (grid_cols + (grid_cols - 1) * overlap)
    step_height = height / (grid_rows + (grid_rows - 1) * overlap)
    
    # Calculate actual crop dimensions
    crop_width = int(step_width * (1 + overlap))
    crop_height = int(step_height * (1 + overlap))
    
    cropped_images = []
    coordinates = []
    
    print(f"Original image size: {width}x{height}")
    print(f"Grid: {grid_rows}x{grid_cols} with {overlap*100:.1f}% overlap")
    print(f"Crop size: {crop_width}x{crop_height}")
    
    for row in range(grid_rows):
        for col in range(grid_cols):
            # Calculate position
            x1 = int(col * step_width * (1 - overlap))
            y1 = int(row * step_height * (1 - overlap))
            x2 = min(x1 + crop_width, width)
            y2 = min(y1 + crop_height, height)
            
            # Ensure minimum size
            if x2 - x1 < 50 or y2 - y1 < 50:
                continue
            
            # Crop the region
            cropped_img = img[y1:y2, x1:x2]
            
            # Convert to bytes
            success, encoded_img = cv2.imencode('.jpg', cropped_img)
            if success:
                cropped_images.append(encoded_img.tobytes())
                coordinates.append((x1, y1, x2, y2))
                print(f"Grid [{row}][{col}]: ({x1}, {y1}) to ({x2}, {y2})")
    
    return cropped_images, coordinates

def crop_image_smart_focus(
    image_bytes: bytes,
    target_size: Tuple[int, int],
    focus_method: str = "center"
) -> bytes:
    """
    Smart crop that focuses on important image regions.
    
    Args:
        image_bytes: Input image as bytes
        target_size: Desired output size (width, height)
        focus_method: Method for determining focus area ("center", "top", "bottom", "left", "right")
    
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
    
    height, width = img.shape[:2]
    target_width, target_height = target_size
    
    print(f"Original image size: {width}x{height}")
    print(f"Target size: {target_width}x{target_height}")
    print(f"Focus method: {focus_method}")
    
    # Calculate aspect ratios
    original_ratio = width / height
    target_ratio = target_width / target_height
    
    if original_ratio > target_ratio:
        # Image is wider, need to crop width
        new_width = int(height * target_ratio)
        new_height = height
        
        if focus_method == "left":
            x1 = 0
        elif focus_method == "right":
            x1 = width - new_width
        else:  # center
            x1 = (width - new_width) // 2
        
        y1 = 0
        x2 = x1 + new_width
        y2 = new_height
        
    else:
        # Image is taller, need to crop height
        new_width = width
        new_height = int(width / target_ratio)
        
        if focus_method == "top":
            y1 = 0
        elif focus_method == "bottom":
            y1 = height - new_height
        else:  # center
            y1 = (height - new_height) // 2
        
        x1 = 0
        x2 = new_width
        y2 = y1 + new_height
    
    print(f"Crop coordinates: ({x1}, {y1}) to ({x2}, {y2})")
    
    # Crop the image
    cropped_img = img[y1:y2, x1:x2]
    
    # Resize to exact target size
    resized_img = cv2.resize(cropped_img, target_size)
    
    print(f"Final size: {resized_img.shape[1]}x{resized_img.shape[0]}")
    
    # Convert back to bytes
    success, encoded_img = cv2.imencode('.jpg', resized_img)
    if not success:
        raise ValueError("Failed to encode cropped image")
    
    return encoded_img.tobytes()

def visualize_crop_regions(
    image_bytes: bytes,
    regions: List[Tuple[int, int, int, int]],
    output_path: str = None,
    show_labels: bool = True
) -> np.ndarray:
    """
    Visualize crop regions on the original image.
    
    Args:
        image_bytes: Input image as bytes
        regions: List of crop regions (x1, y1, x2, y2)
        output_path: Optional path to save visualization
        show_labels: Whether to show region labels
    
    Returns:
        Visualization image with crop regions marked
    """
    # Read image from bytes
    img_array = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    vis_img = img.copy()
    
    # Colors for different regions
    colors = [
        (0, 255, 0),    # Green
        (255, 0, 0),    # Blue
        (0, 0, 255),    # Red
        (255, 255, 0),  # Cyan
        (255, 0, 255),  # Magenta
        (0, 255, 255),  # Yellow
        (128, 0, 128),  # Purple
        (255, 165, 0),  # Orange
    ]
    
    for i, (x1, y1, x2, y2) in enumerate(regions):
        color = colors[i % len(colors)]
        
        # Draw rectangle
        cv2.rectangle(vis_img, (x1, y1), (x2, y2), color, 3)
        
        if show_labels:
            # Add region label
            label = f"Region {i+1}"
            cv2.putText(vis_img, label, (x1+10, y1+30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
            
            # Add dimensions
            width = x2 - x1
            height = y2 - y1
            size_label = f"{width}x{height}"
            cv2.putText(vis_img, size_label, (x1+10, y1+60), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
    
    # Add legend
    legend_y = 30
    cv2.putText(vis_img, f"Total Regions: {len(regions)}", 
               (10, legend_y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    
    # Save if path provided
    if output_path:
        cv2.imwrite(output_path, vis_img)
        print(f"Crop visualization saved to: {output_path}")
    
    return vis_img

# Legacy function for backward compatibility
def crop_image(image_bytes: bytes, left_crop_percent: float = 0.3, bottom_crop_percent: float = 0.3) -> bytes:
    """Legacy crop function - crops from left and bottom only."""
    return crop_image_percentage(
        image_bytes=image_bytes,
        left_crop_percent=left_crop_percent,
        bottom_crop_percent=bottom_crop_percent
    )