from fastapi import APIRouter, HTTPException
from app.schemas import GenerateRequest, GenerateResponse, ExplainRequest, ExplainResponse
from app.services.query_service import run_generate_workflow, run_explain

router = APIRouter()


@router.post("/generate", response_model=GenerateResponse)
async def generate_sql(request: GenerateRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    result = await run_generate_workflow(request.question)
    return result


@router.post("/explain", response_model=ExplainResponse)
async def explain_sql(request: ExplainRequest):
    if not request.sql.strip():
        raise HTTPException(status_code=400, detail="SQL cannot be empty.")
    result = await run_explain(request.sql, request.question or "")
    return result
