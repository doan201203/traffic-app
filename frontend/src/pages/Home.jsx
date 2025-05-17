import React, { useState } from "react";
import useGeolocationPermission from "../hooks/useGeolocationPermission";
import useGeolocation from "../hooks/useGeolocation";
import MapboxMap from "../components/Map/TrafficMap";
import WebcamCapture from "../components/Webcam/WebcamCapture";
import Notification from "../components/Notification/Notification";
import NavigationOverlay from "../components/Map/NavigationOverlay";

export default function Home() {
  const permission = useGeolocationPermission();
  const { coords, error: geoError } = useGeolocation({ lng: 105.85, lat: 21.03 }, permission === "granted");
  const [notification, setNotification] = useState("");
  const [webcamOn, setWebcamOn] = useState(false);
  const [sending, setSending] = useState(false);
  const [warning, setWarning] = useState([]);

  if (permission === "unsupported") {
    return <div>Trình duyệt không hỗ trợ kiểm tra quyền vị trí.</div>;
  }
  if (permission === "denied") {
    return <div style={{ color: "red" }}>Bạn đã từ chối quyền truy cập vị trí. Hãy bật lại quyền vị trí cho trang web này trong cài đặt trình duyệt.</div>;
  }
  if (geoError) {
    return <div style={{ color: "red" }}>{geoError}</div>;
  }

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 24, background: "#f8fafd", borderRadius: 24, boxShadow: "0 4px 32px #0001" }}>
      <h2 style={{ textAlign: "center", color: "#003a53", marginBottom: 32 }}>Ứng dụng cảnh báo giao thông</h2>
      <MapboxMap
          coords={coords}
          notification={notification}
          speedImage={warning && warning[0] ? warning[0].image : null}
      />
      {/* <Notification message={notification} /> */}
      <WebcamCapture
        webcamOn={webcamOn}
        setWebcamOn={setWebcamOn}
        sending={sending}
        setSending={setSending}
        setNotification={setNotification}
        setWarning={setWarning}
      />
    </div>
  );
}