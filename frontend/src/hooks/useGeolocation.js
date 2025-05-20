import { useState, useEffect, useCallback, useRef } from "react";

export default function useGeolocation(defaultCoords = { lng: 105.85, lat: 21.03 }, enabled = true) {
  const [coords, setCoords] = useState(defaultCoords);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const watchIdRef = useRef(null);
  
  // Memoize callback to prevent unnecessary re-renders
  const handleSuccess = useCallback((position) => {
    setCoords({
      lng: position.coords.longitude, 
      lat: position.coords.latitude,
      accuracy: position.coords.accuracy,
      speed: position.coords.speed, // Speed can be useful for traffic apps
      heading: position.coords.heading // Direction of travel
    });
    setError(null);
    setIsLoading(false);
  }, []);

  const handleError = useCallback((error) => {
    setError(
      error.code === 1
        ? "Quyền truy cập vị trí bị từ chối."
        : error.code === 2
        ? "Không thể xác định vị trí."
        : error.code === 3
        ? "Xác định vị trí bị quá thời gian."
        : "Không lấy được vị trí hiện tại."
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (!navigator.geolocation) {
      setError("Trình duyệt không hỗ trợ định vị.");
      return;
    }

    setIsLoading(true);

    // Get position immediately
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    });

    // Then set up watch for position updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enabled, handleSuccess, handleError]);

  // Return loading state along with coords and error
  return { coords, error, isLoading };
}