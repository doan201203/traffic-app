from fastapi import APIRouter
from app.api.endpoints import detection

api_router_v1 = APIRouter()

api_router_v1.include_router(detection.router, tags=["Traffic Sign Detection"])