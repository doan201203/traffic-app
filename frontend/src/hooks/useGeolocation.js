import { useState, useEffect } from "react";

export default function useGeolocation(defaultCoords = { lng: 105.85, lat: 21.03 }) {
  const [coords, setCoords] = useState(defaultCoords);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Trình duyệt không hỗ trợ định vị.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
      (err) => setError("Không lấy được vị trí hiện tại.")
    );
  }, []);

  return { coords, error };
}