from pydantic import BaseModel
from typing import Optional, Any


# -- Request models ----------------------------------------------------------

class GenerateRequest(BaseModel):
    question: str


class ExecuteRequest(BaseModel):
    sql: str


class ExplainRequest(BaseModel):
    sql: str
    question: Optional[str] = None


class HistoryItemCreate(BaseModel):
    id: str
    question: str
    sql: str
    timestamp: str
    valid: bool = True
    row_count: Optional[int] = None
    execution_duration_ms: Optional[float] = None
    error: Optional[str] = None


# -- Response models ---------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    version: str
    model: str


class ColumnInfo(BaseModel):
    name: str
    type: str
    primary_key: bool = False
    nullable: bool = True


class ForeignKeyInfo(BaseModel):
    column: str
    referred_table: str
    referred_column: str


class TableSchema(BaseModel):
    name: str
    columns: list[ColumnInfo]
    foreign_keys: list[ForeignKeyInfo] = []


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
    is_ambiguous: bool = False
    clarification: Optional[str] = None
    reasoning: Optional[str] = None
    tables_referenced: list[str] = []
    duration_ms: float = 0.0


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


class HistoryItemResponse(BaseModel):
    id: str
    question: str
    sql: str
    timestamp: str
    valid: bool
    row_count: Optional[int] = None
    execution_duration_ms: Optional[float] = None
    error: Optional[str] = None


class HistoryDeleteResponse(BaseModel):
    success: bool
    deleted_id: Optional[str] = None
    deleted_count: Optional[int] = None
