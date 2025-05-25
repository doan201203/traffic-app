import React, { useRef, useCallback, useState, useEffect, memo } from "react";
import Webcam from "react-webcam";
import useInterval from "../../hooks/useInterval";
import { Button, WebcamBox } from "./webcamCapture.styles";
import { useTrafficSignWebSocket, ConnectionStatus } from '../../hooks/useTrafficSignWebSocket';

const WebcamCapture = ({ 
  webcamOn, 
  setWebcamOn, 
  sending, 
  setSending, 
  setNotification, 
  setWarnings,
  facingMode,
  setFacingMode
}) => {
  const webcamRef = useRef(null);
  const { sendMess, lastMess, connectionStatus } = useTrafficSignWebSocket(webcamOn);
  const [cameraError, setCameraError] = useState(null);
  const [videoConstraints, setVideoConstraints] = useState({
    facingMode: facingMode,
    width: { ideal: 640 },
    height: { ideal: 640 },
  });
  
  // Update video constraints when facingMode changes
  useEffect(() => {
    setVideoConstraints(current => ({
      ...current,
      facingMode
    }));
  }, [facingMode]);
  
  // Monitor and report connection status
  useEffect(() => {
    if (webcamOn) {
      setNotification(getStatusText(connectionStatus));
    }
  }, [webcamOn, connectionStatus, setNotification]);

  // Process results from backend
  useEffect(() => {
    console.log(lastMess);
    if (!lastMess) return;
    
    if (lastMess.error) {
      setNotification(`Lỗi: ${lastMess.error}`);
      setWarnings([]);
    } else if (lastMess.warnings && lastMess.warnings.length > 0) {
      // Use warnings directly without sorting
      setWarnings(lastMess.warnings);
    } else {
      setNotification(`Không phát hiện cảnh báo giao thông.`);
      setWarnings([]);
    }
    setSending(false);
  }, [lastMess, setNotification, setSending, setWarnings]);

  // Throttled frame sending with dynamic interval based on device performance
  // More powerful devices will use 700ms, slower ones 1000ms
  const [frameInterval, setFrameInterval] = useState(250);
  
  // useEffect(() => {
  //   // Measure device performance to set appropriate frame rate
  //   if (webcamOn) {
  //     const start = performance.now();
  //     let counter = 0;
      
  //     const timer = setTimeout(() => {
  //       const end = performance.now();
  //       const perfScore = end - start;
        
  //       // Adjust interval based on performance
  //       if (perfScore < 50) {
  //         setFrameInterval(200); // Fast device
  //       } else {
  //         setFrameInterval(300); // Slower device
  //       }
  //     }, 200);
      
  //     return () => clearTimeout(timer);
  //   }
  // }, [webcamOn]);

  // Send frames at the appropriate interval
  useInterval(() => {
    if (webcamOn && connectionStatus === ConnectionStatus.OPEN && !sending && !cameraError) {
      sendFrame();
    }
  }, webcamOn && connectionStatus === ConnectionStatus.OPEN ? frameInterval : null);

  // Frame sending function with optimized error handling
  const sendFrame = useCallback(() => {
    if (!webcamRef.current || connectionStatus !== ConnectionStatus.OPEN || sending) return;
    
    try {
      const imgSrc = webcamRef.current.getScreenshot();
      if (!imgSrc) return;
      
      setSending(true);
      const payload = {
        image: imgSrc.split(',')[1],
        confidence_threshold: 0.6,
        window_size: [240, 240],
        nms_threshold: 0.3,
      };
      sendMess(payload);
    } catch (error) {
      console.error("Error capturing webcam frame:", error);
      setCameraError("Error capturing camera frame");
      setSending(false);
    }
  }, [sendMess, connectionStatus, setSending, sending]);

  // Helper function for connection status text
  function getStatusText(status) {
    switch (status) {
      case ConnectionStatus.CONNECTING: return "Đang kết nối...";
      case ConnectionStatus.OPEN: return "Đã kết nối camera";
      case ConnectionStatus.CLOSING: return "Đang đóng kết nối...";
      case ConnectionStatus.CLOSED: return "Đã ngắt kết nối camera";
      case ConnectionStatus.ERROR: return "Lỗi kết nối camera";
      default: return "Không xác định trạng thái camera";
    }
  }

  // Switch between front/back camera
  const handleSwitchCamera = useCallback(() => {
    setFacingMode((prev) => {
      return prev === "user" ? "environment" : "user";
    });
    // Reset camera error when switching cameras
    setCameraError(null);
  }, [setFacingMode]);

  // Handle camera errors
  const handleCameraError = useCallback((error) => {
    console.error("Camera error:", error);
    setCameraError("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập và thiết bị.");
    setNotification("Lỗi truy cập camera");
  }, [setNotification]);

  // Handle successful camera start
  const handleCameraStart = useCallback(() => {
    setCameraError(null);
  }, []);

  return (
    <WebcamBox>
      <Button onClick={() => {
        if (webcamOn) {
          // Clean up resources when turning camera off
          setWarnings([]);
          setNotification("");
        }
        setWebcamOn(prev => !prev);
        setCameraError(null);
      }}>
        {webcamOn ? "Tắt camera" : "Bật camera"}
      </Button>
      
      {webcamOn && (
        <Button onClick={handleSwitchCamera} style={{ marginTop: 8 }}>
          Chuyển camera {facingMode === "user" ? "sau" : "trước"}
        </Button>
      )}
      
      {cameraError && (
        <div style={{ color: 'red', margin: '10px 0', padding: '8px', background: '#ffeeee', borderRadius: '4px' }}>
          {cameraError}
        </div>
      )}
      
      {webcamOn && (
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          width={640}
          height={640}
          videoConstraints={videoConstraints}
          onUserMediaError={handleCameraError}
          onUserMedia={handleCameraStart}
          imageSmoothing={true}
          screenshotQuality={1}
        />
      )}
    </WebcamBox>
  );
};

// Prevent unnecessary re-renders
export default memo(WebcamCapture);