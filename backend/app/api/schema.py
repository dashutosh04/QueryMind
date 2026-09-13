from fastapi import APIRouter
from app.schemas import SchemaResponse
from app.services.schema_service import get_schema

router = APIRouter()


@router.get("/schema", response_model=SchemaResponse)
async def schema():
    return get_schema()
