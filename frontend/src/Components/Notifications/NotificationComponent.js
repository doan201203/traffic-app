import React, { useEffect, useState, useRef, useCallback } from 'react';
import './NotificationComponent.css';

const YOLO_API_ENDPOINT = 'http://localhost:8000/detect';

const NotificationComponent = () => {
  const [warnings, setWarnings] = useState([]);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // For frame processing

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = useCallback(async () => {
    setIsCameraStarting(true);
    setError(null); // Clear previous errors
    setWarnings([]); // Clear previous warnings
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current && canvasRef.current) {
            // Match canvas dimensions to the video stream for accurate capture
            // Or keep 640x480 if that's a specific requirement for the backend
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            // console.log(`Camera started with dimensions: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
          }
          setIsCameraOn(true);
          setIsCameraStarting(false);
        };
        // Handle cases where onloadedmetadata might not fire (e.g., if already loaded)
        // Though for a fresh stream, it should.
        if (videoRef.current.readyState >= videoRef.current.HAVE_METADATA) {
            if (videoRef.current && canvasRef.current) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
            }
            setIsCameraOn(true);
            setIsCameraStarting(false);
        }

      }
    } catch (err) {
      console.error("Lỗi khi truy cập camera:", err);
      setError(`Không thể truy cập camera: ${err.message}. Vui lòng kiểm tra quyền truy cập và thiết bị.`);
      setIsCameraStarting(false);
      setIsCameraOn(false); // Ensure camera is marked as off
    }
  }, []); // No dependencies, as it uses refs and setState

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
    setIsCameraStarting(false); // Reset this state as well
    setWarnings([]);
    setError(null);
    // setIsLoading(false); // If any processing was ongoing, though captureAndSendFrame handles its own loading
  }, []); // No dependencies

  const toggleCamera = () => {
    if (isCameraOn) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const captureAndSendFrame = useCallback(async () => {
    console.log(!isCameraOn, !videoRef.current, !canvasRef.current, videoRef.current.readyState, videoRef.current.ended, videoRef.current.videoWidth)
    if (!isCameraOn || !videoRef.current || !canvasRef.current || 
        videoRef.current.readyState < 2 || // HAVE_CURRENT_DATA
        videoRef.current.ended || 
        videoRef.current.videoWidth === 0) {
      // Added checks for video state
      return;
    }
    console.log("HELLO")

    setIsLoading(true);
    setError(null); // Clear previous processing errors before a new attempt
    const context = canvasRef.current.getContext('2d');
    if (!context) {
        console.error("Could not get 2D context from canvas");
        setIsLoading(false);
        return;
    }
    // Ensure canvas dimensions are set if they weren't (e.g. onloadedmetadata timing)
    if (canvasRef.current.width === 0 || canvasRef.current.height === 0) {
        if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
        } else {
            // Fallback if video dimensions are still not available, though unlikely at this point
            // Or, if you *require* 640x480 for the backend:
            canvasRef.current.width = 640;
            canvasRef.current.height = 480;
            // console.warn("Video dimensions not available, falling back to 640x480 for canvas.");
        }
    }


    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    
    const blob = await new Promise(resolve => {
      canvasRef.current.toBlob(resolve, 'image/jpeg', 0.8); // 0.8 quality
    });

    if (!blob) {
        console.error("Failed to create blob from canvas.");
        setIsLoading(false);
        return;
    }

    const formData = new FormData();
    formData.append('frame', blob, 'frame.jpg');
    console.log('Sending frame with size:', blob.size, 'bytes');

    try {
      const response = await fetch(YOLO_API_ENDPOINT, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header, let the browser set it with the boundary
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorData = { message: `Lỗi không xác định từ server (${response.status})`};
        try {
            const responseText = await response.text();
            console.log('Error response text:', responseText);
            try {
                errorData = JSON.parse(responseText);
            } catch (jsonParseError) {
                errorData.message = responseText || errorData.message;
            }
        } catch (textError) {
            console.error("Failed to read error response:", textError);
        }
        throw new Error(`Lỗi từ server: ${response.status} ${response.statusText} - ${errorData.message || 'Không có thông tin lỗi chi tiết'}`);
      }

      const newWarningsData = await response.json();
      if (Array.isArray(newWarningsData)) {
        // Add new warnings, potentially to existing ones or replace them
        // Current code replaces them, which is fine for this use case
        setWarnings(newWarningsData.map((msg, index) => ({ id: `cam-${Date.now()}-${index}-${Math.random()}`, message: msg })));
      } else {
        console.warn("Dữ liệu cảnh báo không phải là mảng:", newWarningsData);
        setError("Dữ liệu cảnh báo từ server không hợp lệ.");
        setWarnings([]); // Clear warnings if data is invalid
      }
    } catch (err) {
      console.error('Lỗi khi gửi frame hoặc xử lý phản hồi:', err);
      setError(`Lỗi khi xử lý frame: ${err.message}`);
      // setWarnings([]); // Decide if errors should clear existing valid warnings. Current behavior does.
    } finally {
      setIsLoading(false);
    }
  }, [isCameraOn]); // Dependencies: isCameraOn. videoRef and canvasRef are refs.

  useEffect(() => {
    let timeoutId = null;
    const processFrameLoop = () => {
      if (isCameraOn && !isCameraStarting) { // Ensure camera is fully on
        captureAndSendFrame().finally(() => {
          // Schedule next frame processing regardless of success/failure of current one
          if (streamRef.current) { // Only schedule if camera is still supposed to be on
             timeoutId = setTimeout(processFrameLoop, 1000); // Process roughly every 1 second
          }
        });
      }
    };

    if (isCameraOn && !isCameraStarting) {
      processFrameLoop(); // Start the loop
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isCameraOn, isCameraStarting, captureAndSendFrame]);

  // Cleanup effect for when the component unmounts
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]); // stopCamera is memoized

  return (
    <div className="notification-container">
      <div className="notification-header">
        <h2>Traffic Warnings</h2>
        <button 
            onClick={toggleCamera} 
            className={`camera-toggle-button ${isCameraOn ? 'camera-on' : 'camera-off'}`}
            disabled={isCameraStarting || isLoading}
        >
          {isCameraStarting ? 'Đang xử lý...' : (isCameraOn ? 'Tắt Camera' : 'Bật Camera')}
        </button>
      </div>

      <div className="camera-feed-container" style={{ display: (isCameraOn || isCameraStarting) ? 'block' : 'none' }}>
        <video ref={videoRef} autoPlay playsInline muted className="video-feed" />
        <canvas ref={canvasRef} style={{ display: 'none' }} /> {/* Keep canvas hidden, it's for processing */}
      </div>

      {isCameraStarting && <p className="status-message">Đang bật camera...</p>}
      {error && <p className="error-message">{error}</p>}
      
      {/* Show loading message only when camera is on and processing, not during startup */}
      {isCameraOn && !isCameraStarting && isLoading && <p className="status-message">Đang xử lý frame...</p>}

      {isLoading && (
        <div className="loading-overlay">
          <span>Đang xử lý frame...</span>
        </div>
      )}

      {!isCameraOn && !isCameraStarting && warnings.length === 0 && !error && (
        <p>Bật camera để nhận cảnh báo giao thông trực tiếp.</p>
      )}
      {/* Message when camera is on but no warnings AND not currently loading/error */}
      {isCameraOn && !isLoading && !error && warnings.length === 0 && (
        <p>Không có cảnh báo nào được phát hiện từ camera.</p>
      )}

      {/* {* ***** THE MAIN FIX: UNCOMMENT THIS SECTION ***** */}
      {warnings.length > 0 && (
        <ul className="warnings-list">
          {warnings.map(warning => (
            <li key={warning.id} className="warning-item">
              {warning.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NotificationComponent;