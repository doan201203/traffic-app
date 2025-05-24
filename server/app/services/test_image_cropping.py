import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from image_cropping_utils import (
    crop_image_percentage,
    crop_image_coordinates,
    crop_image_center,
    crop_image_multiple_regions,
    crop_image_grid,
    crop_image_smart_focus,
    visualize_crop_regions,
    crop_image  # Legacy function
)
import cv2
import numpy as np

def create_test_image():
    """Create a test image for cropping demonstration"""
    # Create a 1280x720 test image with patterns
    img = np.zeros((720, 1280, 3), dtype=np.uint8)
    
    # Add background gradient
    for y in range(720):
        for x in range(1280):
            img[y, x] = [x//5, y//3, (x+y)//8]
    
    # Add some colored rectangles at different positions
    cv2.rectangle(img, (100, 100), (300, 300), (0, 255, 0), -1)  # Green top-left
    cv2.rectangle(img, (500, 200), (700, 400), (255, 0, 0), -1)  # Blue center
    cv2.rectangle(img, (900, 400), (1200, 600), (0, 0, 255), -1) # Red bottom-right
    cv2.rectangle(img, (200, 500), (400, 650), (255, 255, 0), -1) # Cyan bottom-left
    
    # Add text labels
    cv2.putText(img, "TOP-LEFT", (110, 200), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    cv2.putText(img, "CENTER", (520, 300), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    cv2.putText(img, "BOTTOM-RIGHT", (920, 500), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    cv2.putText(img, "BOTTOM-LEFT", (220, 580), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
    
    # Convert to bytes
    success, encoded = cv2.imencode('.jpg', img)
    return encoded.tobytes()

def save_cropped_image(image_bytes, filename):
    """Helper function to save cropped image for visualization"""
    with open(filename, 'wb') as f:
        f.write(image_bytes)
    print(f"Saved: {filename}")

def test_image_cropping():
    """Test all image cropping functionality"""
    print("Testing Image Cropping Utilities")
    print("=" * 50)
    
    # Create test image
    original_bytes = create_test_image()
    print("✓ Created test image (1280x720)")
    
    # Save original for reference
    save_cropped_image(original_bytes, "original_test_image.jpg")
    
    # Test 1: Percentage-based cropping
    print("\n1. Testing percentage-based cropping...")
    cropped_percent = crop_image_percentage(
        original_bytes,
        left_crop_percent=0.2,   # Remove 20% from left
        right_crop_percent=0.1,  # Remove 10% from right
        top_crop_percent=0.15,   # Remove 15% from top
        bottom_crop_percent=0.1  # Remove 10% from bottom
    )
    save_cropped_image(cropped_percent, "cropped_percentage.jpg")
    
    # Test 2: Coordinate-based cropping
    print("\n2. Testing coordinate-based cropping...")
    cropped_coords = crop_image_coordinates(
        original_bytes,
        x1=400, y1=150, x2=900, y2=500
    )
    save_cropped_image(cropped_coords, "cropped_coordinates.jpg")
    
    # Test 3: Center cropping
    print("\n3. Testing center cropping...")
    cropped_center = crop_image_center(
        original_bytes,
        crop_width=600,
        crop_height=400
    )
    save_cropped_image(cropped_center, "cropped_center.jpg")
    
    # Test 4: Multiple regions cropping
    print("\n4. Testing multiple regions cropping...")
    regions = [
        (100, 100, 300, 300),    # Top-left green rectangle
        (500, 200, 700, 400),    # Center blue rectangle
        (900, 400, 1200, 600),   # Bottom-right red rectangle
    ]
    cropped_regions = crop_image_multiple_regions(original_bytes, regions)
    for i, region_bytes in enumerate(cropped_regions):
        save_cropped_image(region_bytes, f"cropped_region_{i+1}.jpg")
    
    # Test 5: Grid cropping
    print("\n5. Testing grid cropping...")
    grid_crops, grid_coords = crop_image_grid(
        original_bytes,
        grid_rows=2,
        grid_cols=3,
        overlap_percent=0.1
    )
    print(f"Generated {len(grid_crops)} grid crops")
    for i, crop_bytes in enumerate(grid_crops):
        save_cropped_image(crop_bytes, f"grid_crop_{i+1}.jpg")
    
    # Test 6: Smart focus cropping
    print("\n6. Testing smart focus cropping...")
    focus_methods = ["center", "left", "right", "top", "bottom"]
    target_size = (640, 360)  # 16:9 aspect ratio
    
    for method in focus_methods:
        cropped_focus = crop_image_smart_focus(
            original_bytes,
            target_size=target_size,
            focus_method=method
        )
        save_cropped_image(cropped_focus, f"smart_focus_{method}.jpg")
    
    # Test 7: Legacy function
    print("\n7. Testing legacy crop function...")
    cropped_legacy = crop_image(
        original_bytes,
        left_crop_percent=0.3,
        bottom_crop_percent=0.3
    )
    save_cropped_image(cropped_legacy, "cropped_legacy.jpg")
    
    # Test 8: Visualization
    print("\n8. Creating crop region visualization...")
    
    # Visualize grid regions
    vis_img = visualize_crop_regions(
        original_bytes,
        regions=grid_coords,
        output_path="crop_grid_visualization.jpg",
        show_labels=True
    )
    
    # Visualize multiple specific regions
    specific_regions = [
        (100, 100, 300, 300),    # Green rectangle
        (500, 200, 700, 400),    # Blue rectangle
        (900, 400, 1200, 600),   # Red rectangle
        (200, 500, 400, 650),    # Cyan rectangle
    ]
    vis_img2 = visualize_crop_regions(
        original_bytes,
        regions=specific_regions,
        output_path="crop_regions_visualization.jpg",
        show_labels=True
    )
    
    print("\n" + "=" * 50)
    print("All cropping tests completed successfully!")
    print("✓ Percentage-based cropping")
    print("✓ Coordinate-based cropping") 
    print("✓ Center cropping")
    print("✓ Multiple regions cropping")
    print("✓ Grid cropping with overlap")
    print("✓ Smart focus cropping")
    print("✓ Legacy function compatibility")
    print("✓ Crop visualization")
    print("\nGenerated files:")
    print("- original_test_image.jpg")
    print("- cropped_percentage.jpg")
    print("- cropped_coordinates.jpg")
    print("- cropped_center.jpg")
    print("- cropped_region_1.jpg, cropped_region_2.jpg, cropped_region_3.jpg")
    print("- grid_crop_1.jpg through grid_crop_6.jpg")
    print("- smart_focus_center.jpg, smart_focus_left.jpg, etc.")
    print("- cropped_legacy.jpg")
    print("- crop_grid_visualization.jpg")
    print("- crop_regions_visualization.jpg")

if __name__ == "__main__":
    test_image_cropping()