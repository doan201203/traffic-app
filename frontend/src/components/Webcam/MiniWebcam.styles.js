import styled from "styled-components";
import Webcam from "react-webcam";
import { ConnectionStatus } from '../../hooks/useTrafficSignWebSocket';

export const MiniWebcamContainer = styled.div`
  position: absolute;
  bottom: 25vh;
  right: 4px;
  width: 160px;
  height: 160px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 5;
  border: 3px solid white;
  background-color: black;
  pointer-events: auto;
  
  @media (max-width: 600px) {
    width: 100px;
    height: 100px;
    right: 2px;
  }
`;

export const StyledWebcam = styled(Webcam)`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const ConnectionIndicator = styled.div`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${props => props.status === ConnectionStatus.OPEN ? '#4caf50' : props.status === ConnectionStatus.CONNECTING ? '#ff9800' : '#f44336'};
`;

export const CloseButton = styled.button`
  position: absolute;
  top: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  z-index: 6;
  padding: 0;
  
  &:active {
    background-color: rgba(0, 0, 0, 0.7);
  }
`;