import React, { useRef, useCallback, useState, useEffect } from "react";
import Webcam from "react-webcam";
import useInterval from "../../hooks/useInterval";
import { Button, WebcamBox } from "./webcamCapture.styles";
import { sendTrafficFrame } from "../../services/trafficSignApi";
import { trafficSignWs } from "../../services/trafficSignWs";
import {useTrafficSignWebSocket, ConnectionStatus} from '../../hooks/useTrafficSignWebSocket'

export default function WebcamCapture({ webcamOn, setWebcamOn, sending, setSending, setNotification, setWarning }) {
  const webcamRef = useRef(null);
  const [facingMode, setFacingMode] = useState("environment"); // "user" = camera trước, "environment" = camera sau
  const {sendMess, lastMess, connectionStatus} = useTrafficSignWebSocket(webcamOn);
  
  useEffect(() => {
    console.log(`Webcam: ${webcamOn}, WS Status: ${connectionStatus}, Sending: ${sending}`);
  }, [webcamOn, connectionStatus, sending]);

  useEffect(() => {
    if (lastMess) {
      if (lastMess.error) {
        setNotification(`Lỗi: ${lastMess.error}`);
      } else if (lastMess.warnings && lastMess.warnings.length > 0) {
        setWarning(lastMess.warnings);
        lastMess.warnings.forEach(w => {
          setNotification(`Cảnh báo: ${w.class_name} (${Math.round(w.confidence * 100)}%)`);
        });
      } else {
        setNotification(`Đã nhận được dữ liệu`);
      }
      setSending(false);
    }
  }, [lastMess, setNotification, setSending, setWarning]); 

  // Hàm gửi frame
  const sendFrame = useCallback(() => {
    if (!webcamRef.current) return;

    // Chỉ gửi khi kết nối đang mở
    if (connectionStatus !== ConnectionStatus.OPEN) {
        console.warn("Cannot send frame, WebSocket not open. Status:", connectionStatus);
        // Không nên setSending(false) ở đây vì có thể đang gửi tin nhắn trước đó
        return;
    }

    if (sending) {
      console.log("Skipping sendFrame, already sending.");
      return;
    }

    const imgSrc = webcamRef.current.getScreenshot()
    if (!imgSrc) {
      console.warn("sendFrame: No image captured.");
      return;
    }

    setSending(true)

    const payload = {
      image: imgSrc.split(',')[1],
      confidence_threshold: 0.4
    }

    sendMess(payload)
  }, [sendMess, connectionStatus, setSending, sending]);
  
  useInterval(() => {
    // Kiểm tra cả webcamOn và connectionStatus
    if (webcamOn && connectionStatus === ConnectionStatus.OPEN) {
       // Chỉ gửi nếu không đang trong quá trình sending của frame trước đó
       if (!sending) {  
           sendFrame();
       } else {
          console.log("Skipping sendFrame, previous one still processing.");
       }
    }
  }, webcamOn && connectionStatus === ConnectionStatus.OPEN ? 500 : null);


   // Helper để hiển thị trạng thái kết nối
  const getStatusText = (status) => {
    switch (status) {
      case ConnectionStatus.CONNECTING: return "Đang kết nối...";
      case ConnectionStatus.OPEN: return "Đã kết nối";
      case ConnectionStatus.CLOSING: return "Đang đóng...";
      case ConnectionStatus.CLOSED: return "Đã ngắt kết nối";
      case ConnectionStatus.ERROR: return "Lỗi kết nối";
      default: return "Không xác định";
    }
  };
  // Hàm chuyển camera trước/sau
  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  return (
    <WebcamBox>
      <Button onClick={() => setWebcamOn(w => !w)}>
        {webcamOn ? "Tắt camera" : "Bật camera"}
      </Button>
      {webcamOn && (
        <Button onClick={handleSwitchCamera} style={{ marginTop: 8 }}>
          Chuyển camera {facingMode === "user" ? "sau" : "trước"}
        </Button>
      )}
      {/* {sending && <div>Đang gửi ảnh...</div>} */}
      {webcamOn && (
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          width={640}
          height={640}
          videoConstraints={{
            facingMode: facingMode,
            // width:640,
            // height:640
          }}
          // mirrored={facingMode === "user"}
        />
      )}
    </WebcamBox>
  );
}