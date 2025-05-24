export async function sendTrafficFrame(imageSrc, options = {}) {
  // imageSrc là base64 dataURL từ webcam
  const blob = await (await fetch(imageSrc)).blob();
  const formData = new FormData();
  formData.append("file", blob, "frame.jpg");
  
  // Add sliding window parameters as query parameters
  const params = new URLSearchParams({
    confidence_threshold: options.confidence_threshold || 0.3,
    window_size: options.window_size || "416,416",
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

  const res = await fetch(`localhost:8000/detect-frame?${params}`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Lỗi gửi ảnh lên server");
  return res.json();
}