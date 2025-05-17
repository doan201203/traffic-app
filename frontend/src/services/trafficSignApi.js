export async function sendTrafficFrame(imageSrc) {
  // imageSrc là base64 dataURL từ webcam
  const blob = await (await fetch(imageSrc)).blob();
  const formData = new FormData();
  formData.append("file", blob, "frame.jpg");

  const res = await fetch("localhost:8000/ws/detect", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Lỗi gửi ảnh lên server");
  return res.json();
}