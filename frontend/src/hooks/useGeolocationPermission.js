import { useState, useEffect } from "react";

export default function useGeolocationPermission() {
  const [permission, setPermission] = useState("prompt"); // prompt | granted | denied | unsupported

  useEffect(() => {
    if (!navigator.permissions) {
      setPermission("unsupported");
      return;
    }
    navigator.permissions.query({ name: "geolocation" }).then((result) => {
      setPermission(result.state);
      result.onchange = () => setPermission(result.state);
    });
  }, []);

  return permission;
}