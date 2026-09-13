from fastapi import APIRouter, HTTPException
from app.schemas import ExecuteRequest, ExecuteResponse
from app.services.sql_validator import validate_sql_safety
from app.database import get_db_path
import sqlite3

router = APIRouter()


@router.post("/execute", response_model=ExecuteResponse)
async def execute_sql(request: ExecuteRequest):
    sql = request.sql.strip()

    # Validate safety first
    safety = validate_sql_safety(sql)
    if not safety["safe"]:
        raise HTTPException(status_code=400, detail=f"Unsafe SQL: {safety['error']}")

    try:
        conn = sqlite3.connect(get_db_path())
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(sql)
        rows_raw = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        rows = [list(row) for row in rows_raw]
        conn.close()

        return ExecuteResponse(
            columns=columns,
            rows=rows,
            row_count=len(rows),
        )
    except sqlite3.Error as e:
        return ExecuteResponse(
            columns=[],
            rows=[],
            row_count=0,
            error=str(e),
        )
