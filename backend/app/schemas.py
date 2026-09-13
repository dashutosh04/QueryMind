from pydantic import BaseModel
from typing import Optional, Any


# ── Request models ──────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    question: str


class ExecuteRequest(BaseModel):
    sql: str


class ExplainRequest(BaseModel):
    sql: str
    question: Optional[str] = None


# ── Response models ─────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    model: str


class ColumnInfo(BaseModel):
    name: str
    type: str
    primary_key: bool = False
    nullable: bool = True


class TableSchema(BaseModel):
    name: str
    columns: list[ColumnInfo]


class SchemaResponse(BaseModel):
    tables: list[TableSchema]


class ValidationResult(BaseModel):
    valid: bool
    error: Optional[str] = None


class GenerateResponse(BaseModel):
    sql: str
    validation: ValidationResult
    revised: bool = False
    revision_attempts: int = 0


class ExplainResponse(BaseModel):
    explanation: str
    tables_used: list[str]
    operations: list[str]
    filters: list[str]
    sorting_grouping: list[str]


class ExecuteResponse(BaseModel):
    columns: list[str]
    rows: list[list[Any]]
    row_count: int
    error: Optional[str] = None
