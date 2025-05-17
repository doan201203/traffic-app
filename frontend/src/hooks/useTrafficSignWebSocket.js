import {useState, useEffect, useRef, useCallback} from 'react'

// const WS_URL = "ws://localhost:8000/api/v1/ws/detect"

const WS_URL = window.location.hostname === 'localhost' ? `ws://localhost:8000/api/v1/ws/detect` : `wss://${window.location.host}/api/v1/ws/detect` 

export const ConnectionStatus = {
  CONNECTING: 'CONNECTING',
  OPEN: 'OPEN',
  CLOSING: 'CLOSING',
  CLOSED: 'CLOSED',
  ERROR: 'ERROR'
};

export function useTrafficSignWebSocket(enabled = true) {
  const [lastMess, setLastMess] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState(ConnectionStatus.CLOSED)
  const websocket = useRef(null)
  const messQueue = useRef([])
  const connectRetryTimeout = useRef(null)

  const sendMess = useCallback((messagePayload) => {
    if (typeof messagePayload !== 'object' || messagePayload === null) {
      console.error('sendMess: payload must be an object');
      return 
    }

    const messageString = JSON.stringify(messagePayload)

    if (websocket.current && websocket.current.readyState == WebSocket.OPEN) {
      websocket.current.send(messageString)
    }
  }, [])

  const connectWebSocket = useCallback(() => {

    if (!enabled) {
      console.log("connectWebSocket: WebSocket is disabled.");
      disconnectWebSocket();
      return;
    }

    if (
      websocket.current && (
        websocket.current.readyState === WebSocket.CONNECTING ||
        websocket.current.readyState === WebSocket.OPEN
      )) {
      console.log("connectWebSocket: Already connecting or open.");
      return;
    }

    if (connectRetryTimeout.current) {
      clearTimeout(connectRetryTimeout.current)
      connectRetryTimeout.current = null
    }

    console.log("Attempting to connect WS");
    setConnectionStatus(ConnectionStatus.CONNECTING)

    if (websocket.current &&  websocket.current.readyState !== WebSocket.CLOSED) {
      console.log("WS CLOSING");
      websocket.current.close()
    }

    const ws = new WebSocket(WS_URL) 
    websocket.current = ws 
    console.log(ws);
    ws.onopen = () => {
      console.log("WS CONNECTED");
      setConnectionStatus(ConnectionStatus.OPEN)
    }

    ws.onmessage = (event) => {
      try {
        const dat = JSON.parse(event.data)
        messQueue.current.push(dat)
        setLastMess(dat)
      } catch (err) {
        console.error("Failed to parse");
        setLastMess({error: "Failed to parse mess"})
      }
    }

    ws.onerror = (err) => {
      console.error("WS ERROR");
      setConnectionStatus(ConnectionStatus.ERROR)
      console.error(err);
      if (enabled) {
        console.log("RETRY in 5s");
        connectRetryTimeout.current = setTimeout(connectWebSocket, 5000)
      }
    }

    ws.onclose = (event) => {
      console.log("WS CLOSED", event.reason, event.code);

      if (!connectRetryTimeout.current) {
        setConnectionStatus(ConnectionStatus.CLOSED)
      }

      websocket.current = null
      if (enabled && !event.wasClean) { 
        console.log("Connection closed unexpectedly. Scheduling retry...");
        if (!connectRetryTimeout.current) { 
          connectRetryTimeout.current = setTimeout(connectWebSocket, 5000);
        }
      }
    }

  }, [enabled])

  const disconnectWebSocket = useCallback(() => {
    console.log("disconnectWebSocket called.");
    // Clear retry timeout nếu đang chờ
    if (connectRetryTimeout.current) {
        clearTimeout(connectRetryTimeout.current);
        connectRetryTimeout.current = null;
    }

    if (websocket.current) {
       if (websocket.current.readyState === WebSocket.OPEN || websocket.current.readyState === WebSocket.CONNECTING) {
        console.log("Closing WebSocket...");
        websocket.current.close(1000, "User disconnected");
        setConnectionStatus(ConnectionStatus.CLOSING);
       } else {
        if (websocket.current.readyState === WebSocket.CLOSED) {
          setConnectionStatus(ConnectionStatus.CLOSED);
          websocket.current = null; 
        }
       }
    } else {
      setConnectionStatus(ConnectionStatus.CLOSED);
    }
  }, [setConnectionStatus]);

  useEffect(() => {
    if (enabled) {
      connectWebSocket(); // Kết nối khi được bật
    } else {
      disconnectWebSocket(); // Ngắt kết nối khi bị tắt
    }

    // Cleanup: Đảm bảo ngắt kết nối khi hook unmount hoặc `enabled` thành false
    return () => {
      console.log("Cleanup: Disconnecting WebSocket...");
      // Không gọi disconnectWebSocket trực tiếp ở đây để tránh xung đột state
       // Clear retry timeout nếu có
        if (connectRetryTimeout.current) {
            clearTimeout(connectRetryTimeout.current);
        }
       // Đóng kết nối nếu đang mở
      if (websocket.current && websocket.current.readyState === WebSocket.OPEN) {
        websocket.current.close(1000, "Hook cleanup");
      }
      websocket.current = null; // Reset ref
    };
  }, [enabled, connectWebSocket, disconnectWebSocket]); 

  return { sendMess, lastMess, connectionStatus }
}