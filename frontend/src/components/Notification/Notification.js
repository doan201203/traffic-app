import React, { useEffect, useState } from "react";
import { NotificationBox } from "./notification.styles";

export default function Notification({ message }) {
  const [visible, setVisible] = useState(!!message);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [message]);

  if (!message || !visible) return null;

  return (
    <NotificationBox>
      {message}
    </NotificationBox>
  );
}