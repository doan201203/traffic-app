import {useState, useEffect, useRef, useCallback} from 'react'

// Use a function to get WebSocket URL to avoid const reassignment issues
const getWebsocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Get host from environment variables or fallback to window.location.host
  let wsHost = process.env.REACT_APP_WS_HOST || window.location.hostname;
  
  // Special handling for localhost to ensure correct port
  if (wsHost === 'localhost') {
    // Use port 8000 for API server
    return `ws://ec7c-34-118-243-109.ngrok-free.app/api/v1/ws/detect`;
    // return `ws://localhost:8000/api/v1/ws/detect`;
  } else {
    // For production or other environments
    return `wss://ec7c-34-118-243-109.ngrok-free.app/api/v1/ws/detect`;
    //subdomain = 'wss'
    return `${protocol}//${wsHost}/api/v1/ws/detect`;
  }
};

export const ConnectionStatus = {
  CONNECTING: 'CONNECTING',
  OPEN: 'OPEN',
  CLOSING: 'CLOSING',
  CLOSED: 'CLOSED',
  ERROR: 'ERROR'
};

export function useTrafficSignWebSocket(enabled = false) {
  const [lastMess, setLastMess] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(ConnectionStatus.CLOSED);
  const websocket = useRef(null);
  
  // References for managing connection state
  const connectRetryTimeout = useRef(null);
  const retryCount = useRef(0);
  const maxRetryCount = 10;
  const heartbeatInterval = useRef(null);
  
  // Break circular dependency between functions
  const cleanupRef = useRef(null);
  
  // Calculate backoff time
  const getBackoffTime = useCallback(() => {
    const baseTime = Math.min(30000, 1000 * Math.pow(1.5, retryCount.current));
    const jitter = Math.random() * 1000;
    return Math.floor(baseTime + jitter);
  }, []);
  
  // Setup heartbeat function
  const setupHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
    
    heartbeatInterval.current = setInterval(() => {
      if (websocket.current && websocket.current.readyState === WebSocket.OPEN) {
        try {
          websocket.current.send(JSON.stringify({ type: "ping" }));
        } catch (err) {
          console.error("Error sending heartbeat:", err);
          if (cleanupRef.current) cleanupRef.current();
        }
      }
    }, 30000);
  }, []);
  
  // Cleanup function
  const cleanupWebSocket = useCallback(() => {
    if (connectRetryTimeout.current) {
      clearTimeout(connectRetryTimeout.current);
      connectRetryTimeout.current = null;
    }
    
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
    
    if (websocket.current) {
      websocket.current.onopen = null;
      websocket.current.onmessage = null;
      websocket.current.onerror = null;
      websocket.current.onclose = null;
      
      try {
        if (
          websocket.current.readyState === WebSocket.OPEN ||
          websocket.current.readyState === WebSocket.CONNECTING
        ) {
          websocket.current.close(1000, "Cleanup");
        }
      } catch (err) {
        console.error("Error closing WebSocket:", err);
      }
      
      websocket.current = null;
    }
    
    setConnectionStatus(ConnectionStatus.CLOSED);
  }, []);
  
  // Store cleanup function in ref to break circular dependency
  cleanupRef.current = cleanupWebSocket;
  
  // Send message function
  const sendMess = useCallback((messagePayload) => {
    if (typeof messagePayload !== 'object' || messagePayload === null) {
      console.error('sendMess: payload must be an object');
      return;
    }
    
    try {
      if (websocket.current && websocket.current.readyState === WebSocket.OPEN) {
        websocket.current.send(JSON.stringify(messagePayload));
        
        if (retryCount.current > 0) {
          retryCount.current = Math.max(0, retryCount.current - 1);
        }
      } else if (connectionStatus !== ConnectionStatus.CONNECTING) {
        console.warn('Cannot send message: WebSocket not connected');
      }
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      
      if (connectionStatus === ConnectionStatus.OPEN) {
        setConnectionStatus(ConnectionStatus.ERROR);
        cleanupWebSocket();
      }
    }
  }, [connectionStatus, cleanupWebSocket]);

  // Connection management
  useEffect(() => {
    // Don't attempt connection if not enabled
    if (!enabled) {
      cleanupWebSocket();
      return;
    }
    
    function connect() {
      try {
        // Clean up existing connection first
        if (websocket.current) {
          cleanupWebSocket();
        }
        
        // Create new connection with dynamic URL
        const wsUrl = getWebsocketUrl();
        const ws = new WebSocket(wsUrl);
        console.log("Connecting to WebSocket:", wsUrl);
        websocket.current = ws;
        setConnectionStatus(ConnectionStatus.CONNECTING);
        
        ws.onopen = () => {
          console.log("connected")
          setConnectionStatus(ConnectionStatus.OPEN);
          retryCount.current = 0;
          setupHeartbeat();
        };
        
        ws.onmessage = (event) => {
          try {
            if (event.data === 'pong') return;
            
            const data = JSON.parse(event.data);
            setLastMess(data);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
            setLastMess({ error: "Không thể xử lý phản hồi từ máy chủ" });
          }
        };
        
        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          setConnectionStatus(ConnectionStatus.ERROR);
          cleanupWebSocket();
          
          if (enabled && retryCount.current < maxRetryCount) {
            const backoffTime = getBackoffTime();
            console.log(`Attempting reconnection in ${backoffTime}ms (attempt ${retryCount.current + 1})`);
            
            connectRetryTimeout.current = setTimeout(() => {
              retryCount.current += 1;
              connect();
            }, backoffTime);
          } else if (retryCount.current >= maxRetryCount) {
            setLastMess({ error: "Không thể kết nối đến máy chủ sau nhiều lần thử" });
          }
        };
        
        ws.onclose = (event) => {
          if (connectionStatus === ConnectionStatus.CLOSING) {
            setConnectionStatus(ConnectionStatus.CLOSED);
            websocket.current = null;
          } else if (enabled) {
            console.warn(`WebSocket closed unexpectedly: ${event.code} - ${event.reason}`);
            cleanupWebSocket();
            
            if (retryCount.current < maxRetryCount) {
              const backoffTime = getBackoffTime();
              console.log(`Attempting reconnection in ${backoffTime}ms (attempt ${retryCount.current + 1})`);
              
              connectRetryTimeout.current = setTimeout(() => {
                retryCount.current += 1;
                connect();
              }, backoffTime);
            } else {
              setLastMess({ error: "Mất kết nối đến máy chủ" });
            }
          }
        };
      } catch (error) {
        console.error("Error creating WebSocket:", error);
        setConnectionStatus(ConnectionStatus.ERROR);
        
        if (enabled && retryCount.current < maxRetryCount) {
          const backoffTime = getBackoffTime();
          connectRetryTimeout.current = setTimeout(() => {
            retryCount.current += 1;
            connect();
          }, backoffTime);
        }
      }
    }
    
    // Start the connection process
    connect();
    
    // Cleanup on unmount or when enabled changes
    return () => {
      setConnectionStatus(ConnectionStatus.CLOSING);
      cleanupWebSocket();
    };
  }, [enabled, cleanupWebSocket, setupHeartbeat, getBackoffTime]);

  return { sendMess, lastMess, connectionStatus };
}