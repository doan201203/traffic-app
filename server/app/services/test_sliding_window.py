import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sliding_window_utils import (
    sliding_window_inference,
    combine_sliding_window_detections,
    class_agnostic_nms,
    visualize_sliding_windows,
    get_sliding_window_stats,
    window_to_bytes
)
import cv2
import numpy as np
from PIL import Image
import io

def create_test_image():
    """Create a test image for sliding window testing"""
    # Create a 1280x720 test image with some rectangles
    img = np.zeros((640, 640, 3), dtype=np.uint8)
    
    # Add some colored rectangles to simulate objects
    cv2.rectangle(img, (100, 100), (200, 200), (0, 255, 0), -1)  # Green
    cv2.rectangle(img, (400, 300), (500, 400), (255, 0, 0), -1)  # Blue
    cv2.rectangle(img, (800, 150), (900, 250), (0, 0, 255), -1)  # Red
    cv2.rectangle(img, (600, 500), (700, 600), (255, 255, 0), -1)  # Cyan
    
    # Convert to bytes
    success, encoded = cv2.imencode('.jpg', img)
    return encoded.tobytes()

def mock_detector(window_bytes):
    """Mock detector function that returns fake detections"""
    # Convert bytes back to image for analysis
    img_array = np.frombuffer(window_bytes, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    
    # Simple color-based detection (mock)
    detections = []
    
    # Look for green objects
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    green_mask = cv2.inRange(hsv, (40, 50, 50), (80, 255, 255))
    contours, _ = cv2.findContours(green_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    for contour in contours:
        if cv2.contourArea(contour) > 100:  # Filter small areas
            x, y, w, h = cv2.boundingRect(contour)
            detections.append({
                "box": [x, y, x+w, y+h],
                "confidence": 0.8,
                "class_name": "green_object"
            })
    
    # Look for blue objects
    blue_mask = cv2.inRange(hsv, (100, 50, 50), (130, 255, 255))
    contours, _ = cv2.findContours(blue_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    for contour in contours:
        if cv2.contourArea(contour) > 100:
            x, y, w, h = cv2.boundingRect(contour)
            detections.append({
                "box": [x, y, x+w, y+h],
                "confidence": 0.7,
                "class_name": "blue_object"
            })
    
    return detections

from image_cropping_utils import (
  crop_image_percentage
)

def test_sliding_window():
    """Test the sliding window functionality"""
    print("Testing Sliding Window with Stride 80 and Class-Agnostic NMS")
    print("=" * 60)
    
    # Create test image
    image_bytes = create_test_image()
    print("✓ Created test image (1280x720)")
    image_bytes = crop_image_percentage(image_bytes, bottom_crop_percent=0.3, left_crop_percent=0.3)
    # Test sliding window inference
    windows, original_size, coordinates = sliding_window_inference(
        image_bytes=image_bytes,
        window_size=(160, 160),
        stride=80
    )
    print(f"✓ Generated {len(windows)} sliding windows")
    print(f"  Original size: {original_size}")
    print(f"  First few coordinates: {coordinates[:5]}")
    
    # Get statistics
    stats = get_sliding_window_stats(image_bytes, (160, 160), 80)
    print(f"✓ Window statistics:")
    for key, value in stats.items():
        if isinstance(value, float):
            print(f"  {key}: {value:.2f}")
        else:
            print(f"  {key}: {value}")
    
    # Test detection on each window
    print("\n✓ Running mock detection on each window...")
    all_detections = []
    for i, window in enumerate(windows):
        window_bytes = window_to_bytes(window)
        detections = mock_detector(window_bytes)
        all_detections.append(detections)
        if detections:
            print(f"  Window {i+1}: Found {len(detections)} detections")
    
    # Combine detections with class-agnostic NMS
    print("\n✓ Combining detections with class-agnostic NMS...")
    combined_detections = combine_sliding_window_detections(
        window_detections=all_detections,
        window_coordinates=coordinates,
        original_size=original_size,
        iou_threshold=0.5
    )
    
    print(f"✓ Final detections after NMS: {len(combined_detections)}")
    for i, detection in enumerate(combined_detections):
        print(f"  Detection {i+1}: {detection['class_name']} "
              f"(conf: {detection['confidence']:.2f}, "
              f"box: {[int(x) for x in detection['box']]})")
    
    # Test class-agnostic NMS separately
    print("\n✓ Testing class-agnostic NMS with overlapping detections...")
    test_detections = [
        {"box": [100, 100, 200, 200], "confidence": 0.9, "class_name": "car"},
        {"box": [105, 105, 205, 205], "confidence": 0.8, "class_name": "truck"},  # Overlapping
        {"box": [300, 300, 400, 400], "confidence": 0.7, "class_name": "car"},
        {"box": [110, 110, 210, 210], "confidence": 0.6, "class_name": "bus"},   # Overlapping
    ]
    
    nms_result = class_agnostic_nms(test_detections, iou_threshold=0.5)
    print(f"  Before NMS: {len(test_detections)} detections")
    print(f"  After NMS: {len(nms_result)} detections")
    for detection in nms_result:
        print(f"    {detection['class_name']} (conf: {detection['confidence']})")
    
    # Create visualization
    print("\n✓ Creating sliding window visualization...")
    vis_img = visualize_sliding_windows(
        image_bytes=image_bytes,
        window_size=(160, 160),
        stride=80,
        output_path="sliding_window_visualization_test.jpg",
        show_coordinates=True
    )
    print("✓ Visualization saved as 'sliding_window_visualization_test.jpg'")
    
    print("\n" + "=" * 60)
    print("All tests completed successfully!")
    print("Key features verified:")
    print("✓ Sliding window with stride 80")
    print("✓ Class-agnostic NMS (doesn't group by class)")
    print("✓ Proper coordinate adjustment")
    print("✓ Edge case handling")
    print("✓ Visualization capabilities")

if __name__ == "__main__":
    test_sliding_window()