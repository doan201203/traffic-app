# syntax=docker/dockerfile:1
FROM python:3.12.9-slim AS builder

WORKDIR /app

# Cài gói hệ thống cần thiết cho build và runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements trước để tận dụng cache
COPY requirements.txt ./

# Cài dependencies vào thư mục riêng
RUN pip install --user --no-cache-dir -r requirements.txt

# Copy toàn bộ mã nguồn
COPY . .

# --- Final image ---
FROM python:3.12.9-slim
WORKDIR /app

# Cài gói runtime tối thiểu
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies đã cài từ builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy code
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]