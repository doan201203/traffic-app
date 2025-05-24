import React, { useState, useEffect, memo, useCallback } from "react";
import { useGeocode } from '../../hooks/useGeocode';
import MiniWebcam from "../Webcam/MiniWebcam";
import {
  OverlayContainer,
  BottomBar,
  SpeedPanel,
  WarningItem,
  InfoText,
  CameraIndicator
} from './NavigationOverlay.styles';

const WarningItemMemo = memo(({ warning }) => {
  return (
    <WarningItem>
      <img
        src={`data:image/jpeg;base64,${warning.image}`}
        alt={warning.class_name}
        style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, marginBottom: 4, border: "2px solid #eee" }}
        loading="lazy" // Lazy load images for better performance
      />
      <InfoText>{`Cảnh báo: ${warning.class_name} (${Math.round(warning.confidence * 100)}%)`}</InfoText>
    </WarningItem>
  );
});

function NavigationOverlay({ coords, warnings, webcamOn, facingMode }) {
  const [visible, setVisible] = useState(true);
  const { address, isLoading, error } = useGeocode(coords, 10000);
  const [showMiniWebcam, setShowMiniWebcam] = useState(false);
  const [warningQueue, setWarningQueue] = useState([]);
  
  // Update miniWebcam state based on main webcam state
  useEffect(() => {
    if (webcamOn) {
      setShowMiniWebcam(true);
    } else {
      setShowMiniWebcam(false);
    }
  }, [webcamOn]);
  
  // Clean up expired warnings
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setWarningQueue(prevQueue => 
        prevQueue.filter(warning => warning.expireTime > now)
      );
    }, 1000); // Check every second
    
    return () => clearInterval(interval);
  }, []);
  
  // Handle warnings with individual timers
  useEffect(() => {
    if (warnings && warnings.length > 0) {
      const now = Date.now();
      setWarningQueue(prevQueue => {
        const updatedQueue = [...prevQueue];
        const extraTime = 5000; // 10 seconds

        warnings.forEach(warning => {
          // Check if warning already exists in queue
          const existingIdx = updatedQueue.findIndex(item => 
            item.class_name === warning.class_name && 
            item.confidence <= warning.confidence
          );
          const isDuplicate = updatedQueue.some(item =>
            item.class_name === warning.class_name 
          );

          // If warning exists, just update its expiration time
          if (existingIdx !== -1) {
            updatedQueue[existingIdx] = {
              ...updatedQueue[existingIdx],
              image: warning.image,
              expireTime: now + extraTime // Reset to 10 seconds from now
            };
          }
          // Otherwise add new warning with timer
          else if (!isDuplicate) {
            updatedQueue.push({
              ...warning,
              expireTime: now + extraTime
            });
          }
        });
        
        return updatedQueue;
      });
      
      setVisible(true);
    }
  }, [warnings]);

  // Hide panel if there are no warnings
  useEffect(() => {
    if (warningQueue.length === 0) {
      setVisible(false);
    } else {
      setVisible(true);
    }
  }, [warningQueue]);

  return (
    <OverlayContainer>
      {visible && warningQueue && warningQueue.length > 0 && (
        <SpeedPanel>
          {warningQueue.map((warning, idx) => (
            <WarningItemMemo key={`warning-${idx}`} warning={warning} />
          ))}
        </SpeedPanel>
      )}
      <BottomBar>
        {isLoading ? "Loading address..." : error ? "Address error" : address || "Unknown location"}
        {webcamOn && (
          <CameraIndicator>Camera on</CameraIndicator>
        )}
      </BottomBar>
      
      {showMiniWebcam && webcamOn && (
        <MiniWebcam 
          onClose={() => setShowMiniWebcam(false)} 
          facingMode={facingMode}
        />
      )}
    </OverlayContainer>
  );
}

export default memo(NavigationOverlay);