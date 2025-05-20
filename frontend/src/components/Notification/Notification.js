import React, { useState, useEffect } from "react";
import { NotificationBox } from "./notification.styles";

/**
 * Component hiển thị thông báo tạm thời trên màn hình
 *
 * @param {Object} props
 * @param {string} props.message - Nội dung thông báo
 * @param {number} props.duration - Thời gian hiển thị (milliseconds)
 * @param {Function} props.onClose - Callback khi đóng thông báo
 */
const Notification = ({ message, duration = 3000, onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        if (onClose) onClose();
      }, 300); // Đợi animation kết thúc
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [duration, onClose]);

  if (!message) return null;

  return (
    <NotificationBox style={{ opacity: visible ? 1 : 0 }}>
      {message}
    </NotificationBox>
  );
};

export default Notification;