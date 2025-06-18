# Traffic Warning App

Ứng dụng này là một hệ thống cảnh báo và phát hiện biển báo giao thông thời gian thực, kết hợp giữa giao diện người dùng dựa trên React và backend FastAPI viết bằng Python. Nó sử dụng webcam của thiết bị để phát hiện các biển báo giao thông và hiển thị vị trí cùng cảnh báo liên quan trên một bản đồ tương tác.

## Tính năng

* **Phát hiện biển báo giao thông thời gian thực:** Phát hiện các biển báo giao thông khác nhau từ nguồn cấp dữ liệu webcam trực tiếp bằng cách sử dụng mô hình YOLO.
* **Tích hợp định vị địa lý (Geolocation):** Hiển thị vị trí hiện tại của bạn trên bản đồ và liên kết các biển báo giao thông được phát hiện với tọa độ địa lý của chúng.
* **Bản đồ tương tác:** Sử dụng Mapbox GL JS để hiển thị bản đồ động với các điểm đánh dấu cho các cảnh báo được phát hiện.
* **Thông báo thời gian thực:** Cung cấp thông báo tức thì trên màn hình cho các biển báo giao thông được phát hiện và trạng thái kết nối.
* **Kiểm soát Camera:** Cho phép chuyển đổi giữa camera trước và sau trên các thiết bị được hỗ trợ.
* **Thiết kế đáp ứng (Responsive Design):** Tối ưu hóa cho các kích thước màn hình khác nhau, bao gồm cả thiết bị di động.
* **Triển khai bằng Docker:** Dễ dàng thiết lập và chạy toàn bộ ứng dụng bằng Docker Compose.

## Công nghệ sử dụng

### Frontend

* **React:** Thư viện JavaScript để xây dựng giao diện người dùng.
* **Styled-Components:** Để viết CSS trong JavaScript nhằm tạo kiểu cho các component.
* **Mapbox GL JS:** Để hiển thị bản đồ tương tác.
* **React-Webcam:** Component React để truy cập và chụp ảnh từ webcam.
* **Custom Hooks:** `useGeolocationPermission`, `useGeolocation`, `useGeocode`, và `useTrafficSignWebSocket` để quản lý quyền thiết bị, vị trí, tra cứu địa chỉ và giao tiếp WebSocket.
* **Dotenv:** Để quản lý các biến môi trường.

### Backend (FastAPI)

* **FastAPI:** Một framework web hiện đại, nhanh (hiệu suất cao) để xây dựng API với Python 3.7+ dựa trên các gợi ý kiểu Python tiêu chuẩn.
* **Ultralytics YOLO:** Để phát hiện đối tượng tiên tiến bằng cách sử dụng các mô hình YOLO. Đường dẫn mô hình được cấu hình là `models_onnx/min.pt`.
* **OpenCV (`cv2`):** Được sử dụng cho các tác vụ xử lý hình ảnh, bao gồm cắt và thao tác khung hình ảnh.
* **NumPy:** Để thực hiện các phép toán số học trên dữ liệu hình ảnh.
* **Pillow (`PIL`):** Để thao tác hình ảnh.
* **Websockets:** Để giao tiếp thời gian thực giữa frontend và backend để phân tích khung hình liên tục.
* **`uvicorn`:** Một máy chủ ASGI để chạy ứng dụng FastAPI.
* **`python-dotenv`:** Để tải các biến môi trường.
* **`pydantic-settings`:** Để quản lý cài đặt ứng dụng.
* **`watchfiles`:** Để hot-reload backend trong quá trình phát triển.

### Cơ sở hạ tầng

* **Docker & Docker Compose:** Để đóng gói các dịch vụ frontend và backend vào container, đơn giản hóa việc triển khai và phát triển.
* **Nginx (Tùy chọn):** Một cấu hình Nginx mẫu được cung cấp cho việc thiết lập reverse proxy tiềm năng, xử lý các file tĩnh, định tuyến API và proxy kết nối WebSocket, bao gồm hỗ trợ các tiêu đề Cloudflare (hiện đang được comment trong `docker-compose.yml`).

## Cấu trúc dự án
Dưới đây là nội dung đầy đủ của file README.md cho dự án của bạn, có bao gồm các chi tiết về Docker và các công nghệ khác đã phân tích:

Markdown

# Traffic Warning App

Ứng dụng này là một hệ thống cảnh báo và phát hiện biển báo giao thông thời gian thực, kết hợp giữa giao diện người dùng dựa trên React và backend FastAPI viết bằng Python. Nó sử dụng webcam của thiết bị để phát hiện các biển báo giao thông và hiển thị vị trí cùng cảnh báo liên quan trên một bản đồ tương tác.

## Tính năng

* **Phát hiện biển báo giao thông thời gian thực:** Phát hiện các biển báo giao thông khác nhau từ nguồn cấp dữ liệu webcam trực tiếp bằng cách sử dụng mô hình YOLO.
* **Tích hợp định vị địa lý (Geolocation):** Hiển thị vị trí hiện tại của bạn trên bản đồ và liên kết các biển báo giao thông được phát hiện với tọa độ địa lý của chúng.
* **Bản đồ tương tác:** Sử dụng Mapbox GL JS để hiển thị bản đồ động với các điểm đánh dấu cho các cảnh báo được phát hiện.
* **Thông báo thời gian thực:** Cung cấp thông báo tức thì trên màn hình cho các biển báo giao thông được phát hiện và trạng thái kết nối.
* **Kiểm soát Camera:** Cho phép chuyển đổi giữa camera trước và sau trên các thiết bị được hỗ trợ.
* **Thiết kế đáp ứng (Responsive Design):** Tối ưu hóa cho các kích thước màn hình khác nhau, bao gồm cả thiết bị di động.
* **Triển khai bằng Docker:** Dễ dàng thiết lập và chạy toàn bộ ứng dụng bằng Docker Compose.

## Công nghệ sử dụng

### Frontend

* **React:** Thư viện JavaScript để xây dựng giao diện người dùng.
* **Styled-Components:** Để viết CSS trong JavaScript nhằm tạo kiểu cho các component.
* **Mapbox GL JS:** Để hiển thị bản đồ tương tác.
* **React-Webcam:** Component React để truy cập và chụp ảnh từ webcam.
* **Custom Hooks:** `useGeolocationPermission`, `useGeolocation`, `useGeocode`, và `useTrafficSignWebSocket` để quản lý quyền thiết bị, vị trí, tra cứu địa chỉ và giao tiếp WebSocket.
* **Dotenv:** Để quản lý các biến môi trường.

### Backend (FastAPI)

* **FastAPI:** Một framework web hiện đại, nhanh (hiệu suất cao) để xây dựng API với Python 3.7+ dựa trên các gợi ý kiểu Python tiêu chuẩn.
* **Ultralytics YOLO:** Để phát hiện đối tượng tiên tiến bằng cách sử dụng các mô hình YOLO. Đường dẫn mô hình được cấu hình là `models_onnx/min.pt`.
* **OpenCV (`cv2`):** Được sử dụng cho các tác vụ xử lý hình ảnh, bao gồm cắt và thao tác khung hình ảnh.
* **NumPy:** Để thực hiện các phép toán số học trên dữ liệu hình ảnh.
* **Pillow (`PIL`):** Để thao tác hình ảnh.
* **Websockets:** Để giao tiếp thời gian thực giữa frontend và backend để phân tích khung hình liên tục.
* **`uvicorn`:** Một máy chủ ASGI để chạy ứng dụng FastAPI.
* **`python-dotenv`:** Để tải các biến môi trường.
* **`pydantic-settings`:** Để quản lý cài đặt ứng dụng.
* **`watchfiles`:** Để hot-reload backend trong quá trình phát triển.

### Cơ sở hạ tầng

* **Docker & Docker Compose:** Để đóng gói các dịch vụ frontend và backend vào container, đơn giản hóa việc triển khai và phát triển.
* **Nginx (Tùy chọn):** Một cấu hình Nginx mẫu được cung cấp cho việc thiết lập reverse proxy tiềm năng, xử lý các file tĩnh, định tuyến API và proxy kết nối WebSocket, bao gồm hỗ trợ các tiêu đề Cloudflare (hiện đang được comment trong `docker-compose.yml`).

## Cấu trúc dự án

.
├── .gitignore
├── docker-compose.yml
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js
│   │   ├── components/
│   │   │   ├── Notification/
│   │   │   │   ├── Notification.js
│   │   │   │   └── notification.styles.js
│   │   │   └── Webcam/
│   │   │       ├── MiniWebcam.js
│   │   │       └── MiniWebcam.styles.js
│   │   │       └── WebcamCapture.js
│   │   │       └── webcamCapture.styles.js
│   │   ├── hooks/
│   │   │   ├── useGeocode.js
│   │   │   ├── useGeolocation.js
│   │   │   ├── useGeolocationPermission.js
│   │   │   ├── useInterval.js
│   │   │   └── useTrafficSignWebSocket.js
│   │   ├── pages/
│   │   │   └── Home.jsx
│   │   └── services/
│   │       ├── trafficSignApi.js
│   │       └── trafficSignWs.js
│   │   ├── index.js
│   │   ├── package.json
│   │   └── package-lock.json
├── nginx/
│   └── nginx.conf
└── server/
├── app/
│   ├── api/
│   │   ├── init.py
│   │   └── endpoints/
│   │       └── detection.py
│   ├── core/
│   │   └── config.py
│   ├── models/
│   │   └── traffic_warning_models.py
│   ├── services/
│   │   ├── image_cropping_utils.py
│   │   ├── image_tiling_utils.py
│   │   ├── sliding_window_utils.py
│   │   ├── test_image_cropping.py
│   │   └── test_sliding_window.py
│   ├── lifespan.py
│   └── main.py
├── core_models/
│   └── yolo_detector.py
├── models_onnx/
│   └── class_name.txt
└── requirements.txt

## Bắt đầu

Các hướng dẫn này sẽ giúp bạn thiết lập và chạy một bản sao của dự án trên máy cục bộ của bạn cho mục đích phát triển và thử nghiệm.

### Điều kiện tiên quyết

* Đã cài đặt Docker và Docker Compose trên hệ thống của bạn.

### Cài đặt

1.  **Clone repository:**

    ```bash
    git clone <repository-url>
    cd traffic-app-f1
    ```

2.  **Biến môi trường:**
    Tạo file `.env` trong thư mục `server/` và cấu hình cài đặt của bạn.
    ```
    # server/.env ví dụ
    MODEL_PATH=models_onnx/min.pt
    DEVICE=cpu # hoặc "cuda" nếu bạn có GPU tương thích
    CORS_ORIGINS=http://localhost,[https://trdoan20.tech](https://trdoan20.tech),[https://www.trdoan20.tech](https://www.trdoan20.tech),[https://api.trdoan20.tech](https://api.trdoan20.tech)
    ```
    Tạo file `.env` trong thư mục `frontend/` cho các biến môi trường dành riêng cho frontend:
    ```
    # frontend/.env ví dụ
    REACT_APP_MAPBOX_ACCESS_TOKEN=YOUR_MAPBOX_ACCESS_TOKEN
    REACT_APP_WS_HOST=localhost # Đối với phát triển cục bộ, hoặc tên miền của bạn cho sản xuất
    ```
    Thay thế `YOUR_MAPBOX_ACCESS_TOKEN` bằng Mapbox Public Access Token thực tế của bạn. Bạn có thể lấy một cái từ [trang web Mapbox](https://docs.mapbox.com/help/getting-started/access-tokens/).

3.  **Build và chạy bằng Docker Compose:**

    ```bash
    docker-compose up --build
    ```

    Lệnh này sẽ:
    * Build các Docker images cho cả dịch vụ `frontend` và `backend`.
    * Khởi động các dịch vụ.
    * Frontend sẽ có thể truy cập tại `http://localhost:80` (hoặc `http://localhost:3000` nếu bạn truy cập trực tiếp mà không qua Nginx).
    * API backend sẽ có thể truy cập tại `http://localhost:8000`.

    Nếu bạn muốn sử dụng Nginx proxy, hãy bỏ comment phần dịch vụ `nginx` trong `docker-compose.yml` và điều chỉnh cổng khi cần. `nginx.conf` được cung cấp đã được cấu hình để định tuyến lưu lượng truy cập trên cổng 80 đến các dịch vụ phù hợp.

## Cách sử dụng

1.  **Truy cập ứng dụng:** Mở trình duyệt web của bạn và truy cập `http://localhost` (nếu sử dụng Nginx proxy trên cổng 80) hoặc `http://localhost:3000` (nếu truy cập frontend trực tiếp).
2.  **Cấp quyền định vị địa lý:** Ứng dụng sẽ yêu cầu quyền truy cập vào vị trí địa lý của thiết bị của bạn. Vui lòng cấp quyền để các tính năng bản đồ hoạt động.
3.  **Kích hoạt Webcam:** Nhấp vào nút "Bật camera" để khởi động webcam của thiết bị. Ứng dụng sẽ bắt đầu phát hiện các biển báo giao thông trong luồng camera.
4.  **Xem cảnh báo:** Các biển báo giao thông được phát hiện sẽ xuất hiện dưới dạng thông báo và điểm đánh dấu trên bản đồ.
5.  **Chuyển đổi Camera:** Nếu bạn có nhiều camera, hãy sử dụng nút "Chuyển camera" để chuyển đổi giữa chúng.

## API Endpoints

Backend cung cấp các API endpoint sau (có thể truy cập qua `http://localhost:8000/api/v1/` theo mặc định):

* **`GET /`**: Thông báo chào mừng.
* **`POST /detect-frame`**: Phát hiện biển báo giao thông từ khung hình ảnh được tải lên.
    * **Method:** `POST`
    * **Content-Type:** `multipart/form-data`
    * **Tham số:**
        * `file`: File hình ảnh để phát hiện.
        * `confidence_threshold` (float, tùy chọn): Ngưỡng độ tin cậy tối thiểu để một phát hiện được coi là hợp lệ (mặc định: `0.3`).
        * `window_size` (string, tùy chọn): Kích thước của cửa sổ trượt theo định dạng `width,height` (mặc định: `"416,416"`).
        * `stride` (int, tùy chọn): Kích thước bước cho cửa sổ trượt theo pixel (mặc định: `80`).
        * `nms_threshold` (float, tùy chọn): Ngưỡng IoU cho Non-Maximum Suppression độc lập với lớp (mặc định: `0.45`).
        * `visualize` (bool, tùy chọn): Liệu có tạo và trả về hình ảnh trực quan với lưới cửa sổ trượt hay không (mặc định: `False`).
        * `crop_left` (float, tùy chọn): Phần trăm chiều rộng hình ảnh để cắt từ bên trái (0.0-1.0, mặc định: `0.25`).
        * `crop_bottom` (float, tùy chọn): Phần trăm chiều cao hình ảnh để cắt từ phía dưới (0.0-1.0, mặc định: `0.25`).
        * `resize_to_square` (bool, tùy chọn): Thay đổi kích thước hình ảnh đầu vào thành hình vuông trước khi cắt và phát hiện (mặc định: `True`).
        * `target_size` (int, tùy chọn): Kích thước vuông mục tiêu để thay đổi kích thước (ví dụ: 640 cho 640x640, mặc định: `640`).
        * `maintain_aspect_ratio` (bool, tùy chọn): Duy trì tỷ lệ khung hình khi thay đổi kích thước (thêm padding, mặc định: `True`).
    * **Phản hồi:** `TrafficWarningResponse` chứa danh sách các đối tượng `DetectionResult`.
* **`GET /health-ws`**: Kiểm tra trạng thái cho dịch vụ WebSocket.
* **`POST /window-stats`**: Lấy thống kê cửa sổ trượt cho một hình ảnh mà không cần chạy phát hiện.
    * **Method:** `POST`
    * **Content-Type:** `multipart/form-data`
    * **Tham số:** (tương tự như `/detect-frame` cho hình ảnh và cửa sổ)
    * **Phản hồi:** Đối tượng JSON với các thống kê.

* **`WEBSOCKET /ws/detect`**: Phát hiện biển báo giao thông thời gian thực qua WebSocket.
    * **Giao thức:** `ws` (hoặc `wss` cho các kết nối an toàn)
    * **Gửi:** Đối tượng JSON với `image` (chuỗi được mã hóa base64), `confidence_threshold`, `window_size`, `stride`, `nms_threshold`, `visualize`, `crop_left`, `crop_bottom`, `resize_to_square`, `target_size`, `maintain_aspect_ratio`.
    * **Nhận:** Đối tượng JSON `TrafficWarningResponse`.

Bạn có thể tìm thấy tài liệu API chi tiết hơn bằng cách chạy ứng dụng và truy cập `http://localhost:8000/api/v1/docs` (Swagger UI) hoặc `http://localhost:8000/api/v1/redoc` (ReDoc).
