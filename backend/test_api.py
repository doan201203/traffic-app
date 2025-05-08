import requests
import time
import cv2
import numpy as np
from pathlib import Path

def test_health():
    """Test health check endpoint"""
    response = requests.get("http://localhost:8000/health")
    print("\n=== Health Check ===")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

def test_detect_with_image(image_path: str):
    """Test detect endpoint with an image file"""
    print(f"\n=== Testing with image: {image_path} ===")
    
    # Read and prepare image
    if not Path(image_path).exists():
        print(f"Error: Image file not found at {image_path}")
        return

    # Send request
    start_time = time.time()
    with open(image_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(
            "http://localhost:8000/detect",
            files=files
        )
    
    # Calculate total time
    total_time = time.time() - start_time
    
    # Print results
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print("\nWarnings:")
        print(result['warnings'])
        print(f"\nAPI Processing Time: {result['processing_time']:.3f}s")
        print(f"Total Request Time: {total_time:.3f}s")
    else:
        print(f"Error: {response.text}")

def test_detect_with_camera():
    """Test detect endpoint with live camera feed"""
    print("\n=== Testing with Camera ===")
    
    # Initialize camera
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open camera")
        return

    try:
        while True:
            # Capture frame
            ret, frame = cap.read()
            if not ret:
                print("Error: Could not read frame")
                break

            # Save frame temporarily
            temp_path = "temp_frame.jpg"
            cv2.imwrite(temp_path, frame)

            # Send frame to API
            with open(temp_path, 'rb') as f:
                files = {'file': f}
                response = requests.post(
                    "http://localhost:8000/detect",
                    files=files
                )

            # Display results
            if response.status_code == 200:
                result = response.json()
                print("\nWarnings:")
                print(result['warnings'])
                print(f"Processing Time: {result['processing_time']:.3f}s")
            else:
                print(f"Error: {response.text}")

            # Display frame
            cv2.imshow('Camera Feed', frame)
            
            # Break loop on 'q' press
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    finally:
        cap.release()
        cv2.destroyAllWindows()
        # Clean up temp file
        if Path("temp_frame.jpg").exists():
            Path("temp_frame.jpg").unlink()

if __name__ == "__main__":
    # Test health check
    test_health()
    
    # Test with sample image
    test_detect_with_image("path/to/your/test/image.jpg")
    
    # Test with camera (uncomment to use)
    # test_detect_with_camera() 