document.addEventListener('DOMContentLoaded', () => {
  const videoStream = document.getElementById('videoStream');
  const warningList = document.getElementById('warningList');
  const connectionStatus = document.getElementById('connectionStatus');
  const muteButton = document.getElementById('muteButton');
  const soundStatus = document.getElementById('soundStatus');

  let ws = null;
  let isMuted = false;
  let soundQueue = []; // Hàng đợi các âm thanh cần phát
  let isPlayingSound = false; // Cờ để tránh phát nhiều âm thanh cùng lúc

  const serverHost = window.location.hostname; // Lấy host từ URL trình duyệt
  const serverPort = window.location.port || (window.location.protocol === 'https:' ? 443 : 80); // Lấy port hoặc dùng port mặc định
  // Nếu backend chạy trên port khác (ví dụ 8000 khi dev), bạn cần đặt cứng:
  // const wsPort = 8000;
  // const wsUrl = `ws://${serverHost}:${wsPort}/ws`;
  // Còn nếu proxy qua Nginx/..., port có thể là 80/443
  const wsUrl = `ws://${window.location.host}/ws`; // Dùng host và port của trang web hiện tại


  console.log(`Attempting WebSocket connection to: ${wsUrl}`);

  function connectWebSocket() {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
          console.log('WebSocket Connected');
          connectionStatus.textContent = 'Đã kết nối tới server.';
          connectionStatus.style.color = 'green';
      };

      ws.onmessage = (event) => {
          try {
              const message = JSON.parse(event.data);
              // console.log('Message from server:', message);

              if (message.type === 'warnings') {
                  updateWarningList(message.data);
              } else if (message.type === 'play_sound') {
                  if (message.sound_id && !isMuted) {
                      // Thêm âm thanh vào hàng đợi
                      soundQueue.push(message.sound_id);
                      // Nếu không có âm thanh nào đang phát, bắt đầu phát từ hàng đợi
                      if (!isPlayingSound) {
                          playNextSound();
                      }
                  }
              }
          } catch (error) {
              console.error('Failed to parse WebSocket message:', error);
          }
      };

      ws.onerror = (error) => {
          console.error('WebSocket Error:', error);
          connectionStatus.textContent = 'Lỗi kết nối WebSocket.';
          connectionStatus.style.color = 'red';
      };
      
      ws.onclose = () => {
          console.log('WebSocket Disconnected');
          connectionStatus.textContent = 'Mất kết nối WebSocket. Đang thử kết nối lại...';
          connectionStatus.style.color = 'orange';
          // Attempt to reconnect after a delay
          setTimeout(connectWebSocket, 5000); // Reconnect every 5 seconds
      };
  }

  function updateWarningList(warnings) {
      warningList.innerHTML = ''; // Clear previous warnings
      if (warnings && warnings.length > 0) {
          warnings.forEach(warningText => {
              const li = document.createElement('li');
              li.textContent = warningText;
              warningList.appendChild(li);
          });
      } else {
          const li = document.createElement('li');
          li.textContent = 'Chưa có cảnh báo.';
          warningList.appendChild(li);
      }
  }

  function playNextSound() {
       if (soundQueue.length === 0) {
           isPlayingSound = false; // Không còn âm thanh nào trong hàng đợi
           return;
       }

       isPlayingSound = true;
       const soundId = soundQueue.shift(); // Lấy âm thanh đầu tiên từ hàng đợi
       const soundPath = `/sounds/${soundId}`; // Giả định âm thanh nằm trong thư mục /sounds/ trên web server
       console.log(`Playing sound: ${soundPath}`);

       const audio = new Audio(soundPath);
       audio.play()
           .then(() => {
               // console.log(`Sound ${soundId} finished playing.`);
               // Khi âm thanh phát xong, đợi một chút rồi phát âm thanh tiếp theo
               setTimeout(playNextSound, 500); // Delay nhỏ giữa các âm thanh
           })
           .catch(error => {
               console.error(`Error playing sound ${soundId}:`, error);
               // Ngay cả khi lỗi, vẫn cố gắng phát âm thanh tiếp theo
               setTimeout(playNextSound, 500);
           });
   }

  // Check if video stream loads
  videoStream.onerror = () => {
      console.error('Failed to load video stream.');
      connectionStatus.textContent = 'Không thể tải luồng video.';
      connectionStatus.style.color = 'red';
      // Optionally display a placeholder image or message
      videoStream.alt = "Lỗi tải video";
  };
   videoStream.onload = () => {
       console.log('Video stream loaded successfully.');
       // You might not get a load event for MJPEG in all browsers consistently
   };

  // Mute button functionality
  muteButton.addEventListener('click', () => {
      isMuted = !isMuted;
      soundStatus.textContent = isMuted ? 'Đã tắt' : 'Đã bật';
      muteButton.textContent = isMuted ? 'Bật Âm thanh' : 'Tắt Âm thanh';
      if (isMuted) {
          soundQueue = []; // Clear queue when muted
          // Potentially stop any currently playing sound if the browser API allows
      }
      console.log(`Sound ${isMuted ? 'muted' : 'unmuted'}`);
  });


  // Initial connection attempt
  connectWebSocket();
});