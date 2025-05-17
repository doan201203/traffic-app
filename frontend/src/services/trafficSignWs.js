export function trafficSignWs(imageSrc) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket("ws://backend:8000/api/v1/ws/detect");

    ws.onopen = () => {
      const base64 = imageSrc.split(",")[1];
      const payload = JSON.stringify({
        image: base64,
        confidence_threshold: 0.3,
      });
      ws.send(payload);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        resolve(data);
      } catch (error) {
        reject(error);
      }
      ws.close();
    };

    ws.onerror = (event) => {
      reject("WebSocket error");
      ws.close();
    };
  });
}