import React, { useEffect, useState, useCallback, useMemo } from "react";
import useGeolocationPermission from "../hooks/useGeolocationPermission";
import useGeolocation from "../hooks/useGeolocation";
import MapboxMap from "../components/Map/TrafficMap";
import WebcamCapture from "../components/Webcam/WebcamCapture";
import Notification from "../components/Notification/Notification";

export default function Home() {
  // Get geolocation permission and coordinates
  const permission = useGeolocationPermission();
  const { coords, error: geoError, isLoading: geoLoading } = useGeolocation(
    permission === "granted" ? undefined : { lng: 105.85, lat: 21.03 },
    permission === "granted"
  );
  console.log("Coordinates:", coords);
  // Application state
  const [notification, setNotification] = useState("");
  const [webcamOn, setWebcamOn] = useState(false);
  const [sending, setSending] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [facingMode, setFacingMode] = useState("environment");
  
  // Track online status for better user experience
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Show appropriate offline notification
  useEffect(() => {
    if (!isOnline && webcamOn) {
      setNotification("Bạn đang offline! Một số tính năng có thể không khả dụng.");
    }
  }, [isOnline, webcamOn]);
  
  // Memoized callbacks for state updates
  const handleNotification = useCallback((message) => {
    setNotification(message);
  }, []);
  
  const handleWarnings = useCallback((newWarnings) => {
    setWarnings(newWarnings);
  }, []);
  
  // Handle errors with permission and geolocation
  const renderError = useMemo(() => {
    if (permission === "unsupported") {
      return <div style={{ padding: 16, background: "#ffeeee", color: "#d32f2f", borderRadius: 8, marginBottom: 16 }}>
        Trình duyệt không hỗ trợ kiểm tra quyền vị trí.
      </div>;
    }
    if (permission === "denied") {
      return <div style={{ padding: 16, background: "#ffeeee", color: "#d32f2f", borderRadius: 8, marginBottom: 16 }}>
        Bạn đã từ chối quyền truy cập vị trí. Hãy bật lại quyền vị trí cho trang web này trong cài đặt trình duyệt.
      </div>;
    }
    if (geoError) {
      return <div style={{ padding: 16, background: "#ffeeee", color: "#d32f2f", borderRadius: 8, marginBottom: 16 }}>
        {geoError}
      </div>;
    }
    return null;
  }, [permission, geoError]);

  // Render loading state
  if (geoLoading && !coords) {
    return <div style={{ maxWidth: 800, margin: "40px auto", padding: 24, background: "#f8fafd", borderRadius: 24, boxShadow: "0 4px 32px #0001" }}>
      <h2 style={{ textAlign: "center", color: "#003a53", marginBottom: 32 }}>Ứng dụng cảnh báo giao thông</h2>
      <div style={{ textAlign: "center", padding: 24 }}>Đang tải dữ liệu vị trí...</div>
    </div>;
  }

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 24, background: "#f8fafd", borderRadius: 24, boxShadow: "0 4px 32px #0001" }}>
      <h2 style={{ textAlign: "center", color: "#003a53", marginBottom: 32 }}>Ứng dụng cảnh báo giao thông</h2>
      
      {/* Show error notifications if any */}
      {renderError}
      
      {/* Show offline warning */}
      {!isOnline && (
        <div style={{ padding: 8, background: "#fff3e0", color: "#e65100", borderRadius: 8, marginBottom: 16, textAlign: "center" }}>
          <strong>⚠️ Bạn đang offline</strong> - Một số tính năng có thể không khả dụng
        </div>
      )}
      
      {/* Map component */}
      <MapboxMap
        coords={coords}
        warnings={warnings}
        webcamOn={webcamOn}
        facingMode={facingMode}
      />
      
      {/* Notification component */}
      <Notification message={notification} />
      
      {/* Webcam component */}
      <WebcamCapture
        webcamOn={webcamOn}
        setWebcamOn={setWebcamOn}
        sending={sending}
        setSending={setSending}
        setNotification={handleNotification}
        setWarnings={handleWarnings}
        facingMode={facingMode}
        setFacingMode={setFacingMode}
      />
    </div>
  );
}