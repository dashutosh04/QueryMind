import sqlite3
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.database import get_db_path
from app.schemas import SchemaResponse
from app.services.schema_service import get_schema

router = APIRouter()


@router.post("/import-sql", response_model=SchemaResponse)
async def import_sql_file(file: UploadFile = File(...)):
    if not file.filename.endswith(".sql"):
        raise HTTPException(status_code=400, detail="Only .sql files are accepted")

    content = await file.read()
    sql_text = content.decode("utf-8")

    if not sql_text.strip():
        raise HTTPException(status_code=400, detail="SQL file is empty")

    statements = [s.strip() for s in sql_text.split(";") if s.strip()]

    if not statements:
        raise HTTPException(status_code=400, detail="No valid SQL statements found")

    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    cursor = conn.cursor()

    try:
        for stmt in statements:
            cursor.execute(stmt)
        conn.commit()
    except sqlite3.Error as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=400, detail=f"SQL execution error: {str(e)}")
    finally:
        conn.close()

    return get_schema()
