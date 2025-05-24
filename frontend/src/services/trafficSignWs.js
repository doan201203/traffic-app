export function trafficSignWs(imageSrc, options = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket("ws://backend:8000/api/v1/ws/detect");

    ws.onopen = () => {
      const base64 = imageSrc.split(",")[1];
      const payload = JSON.stringify({
        image: base64,
        confidence_threshold: options.confidence_threshold || 0.3,
        window_size: options.window_size || [416, 416],
        stride: options.stride || 80,
        nms_threshold: options.nms_threshold || 0.45,
        visualize: options.visualize || false,
        method: options.method || "sliding_window",
        crop_left: options.crop_left || 0.25,
        crop_bottom: options.crop_bottom || 0.25,
        resize_to_square: options.resize_to_square !== undefined ? options.resize_to_square : true,
        target_size: options.target_size || 640,
        maintain_aspect_ratio: options.maintain_aspect_ratio !== undefined ? options.maintain_aspect_ratio : true
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