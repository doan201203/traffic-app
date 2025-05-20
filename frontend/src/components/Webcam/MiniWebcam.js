import React, { useRef, memo } from "react";
import { useTrafficSignWebSocket } from '../../hooks/useTrafficSignWebSocket';
import {
  MiniWebcamContainer,
  StyledWebcam,
  ConnectionIndicator,
  CloseButton
} from './MiniWebcam.styles';

// This component will be displayed when the main webcam is activated
// It shares the same webcamOn state and facingMode as the main WebcamCapture component
const MiniWebcam = ({ onClose, facingMode }) => {
  const webcamRef = useRef(null);
  
  // Do not initialize a new WebSocket connection, just use the status
  // Since the main WebcamCapture will handle all WebSocket communication
  const { connectionStatus } = useTrafficSignWebSocket(true);
  
  const videoConstraints = {
    facingMode: facingMode,
    width: { ideal: 320 },
    height: { ideal: 320 },
  };
  
  return (
    <MiniWebcamContainer>
      <ConnectionIndicator status={connectionStatus} />
      <CloseButton onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}>✕</CloseButton>
      <StyledWebcam
        ref={webcamRef}
        audio={false}
        videoConstraints={videoConstraints}
        screenshotFormat="image/jpeg"
        mirrored={facingMode === "user"}
      />
    </MiniWebcamContainer>
  );
};

export default memo(MiniWebcam);