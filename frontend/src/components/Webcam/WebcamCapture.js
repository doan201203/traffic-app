import React, { useRef, useCallback, useState } from "react";
import Webcam from "react-webcam";
import useInterval from "../../hooks/useInterval";
import { Button, WebcamBox } from "./webcamCapture.styles";
import { sendTrafficFrame } from "../../services/trafficSignApi";

export default function WebcamCapture({ webcamOn, setWebcamOn, sending, setSending, setNotification }) {
  const webcamRef = useRef();
  const [facingMode, setFacingMode] = useState("user"); // "user" = camera trước, "environment" = camera sau

  // Hàm gửi frame
  const sendFrame = useCallback(async () => {
    if (!webcamRef.current) return;
    setSending(true);
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      setSending(false);
      return;
    }
    try {
      const data = await sendTrafficFrame(imageSrc);
      if (data && data.warnings) setNotification(`Cảnh báo: ${data.warnings}`);
      else setNotification("");
    } catch {
      setNotification("Không thể gửi ảnh lên server.");
    }
    setSending(false);
  }, [setNotification, setSending]);

  // Gửi frame mỗi 5s khi webcam bật
  useInterval(() => {
    if (webcamOn) sendFrame();
  }, webcamOn ? 5000 : null);

  // Hàm chuyển camera trước/sau
  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  return (
    <WebcamBox>
      {webcamOn && (
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          width={320}
          height={240}
          videoConstraints={{
            facingMode: facingMode,
          }}
        />
      )}
      <Button onClick={() => setWebcamOn(w => !w)}>
        {webcamOn ? "Tắt camera" : "Bật camera"}
      </Button>
      {webcamOn && (
        <Button onClick={handleSwitchCamera} style={{ marginTop: 8 }}>
          Chuyển camera {facingMode === "user" ? "sau" : "trước"}
        </Button>
      )}
      {sending && <div>Đang gửi ảnh...</div>}
    </WebcamBox>
  );
}