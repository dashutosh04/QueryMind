from fastapi import APIRouter
from app.schemas import HealthResponse
from app.config import get_settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    settings = get_settings()
    return HealthResponse(
        status="ok",
        version="1.0.0",
        model=settings.groq_model,
    )
