import logging
from fastapi import FastAPI, WebSocket
from app.core.config import settings
from app.lifespan import lifespan
from app.api import api_router_v1

logger = logging.getLogger(__name__)

app = FastAPI(
  title=settings.PROJECT_NAME,
  version="1.0.0",
  lifespan=lifespan,
  openapi_url=f"{settings.API_V1_STR}/openapi.json", # Endpoint cho schema OpenAPI JSON
  docs_url=f"{settings.API_V1_STR}/docs",           # Endpoint cho Swagger UI
  redoc_url=f"{settings.API_V1_STR}/redoc",         # Endpoint cho ReDoc
)

app.include_router(api_router_v1, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
  return {
    "message": "Welcome to the Traffic Sign Detection API"
  }
  
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
  await websocket.accept()
  while True:
    data = await websocket.receive_text()
    await websocket.send_text(f"Message received: {data}")
  await websocket.close()

