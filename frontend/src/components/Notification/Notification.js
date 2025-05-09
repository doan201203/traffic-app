import React from "react";
import { NotificationBox } from "./notification.styles";
export default function Notification({ message }) {
  if (!message) return null;
  return <NotificationBox>{message}</NotificationBox>;
}