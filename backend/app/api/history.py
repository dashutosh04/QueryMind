"""Server-side query history API.

Persists query history to the SQLite database (query_history table).
Provides CRUD operations: list, create, delete-by-id, and clear-all.
History is completely owned by the server - deleting removes records permanently.
"""
import sqlite3
import logging
from fastapi import APIRouter, HTTPException

from app.database import get_db_path
from app.schemas import HistoryItemCreate, HistoryItemResponse, HistoryDeleteResponse

router = APIRouter()
logger = logging.getLogger("querymind.history")


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


# ---------------------------------------------------------------------------
# GET /api/history - retrieve all history items, newest first
# ---------------------------------------------------------------------------

@router.get("/history", response_model=list[HistoryItemResponse])
async def get_history():
    """Return all query history records ordered by timestamp descending."""
    try:
        conn = _get_conn()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, question, sql, timestamp, valid, row_count, execution_duration_ms, error
            FROM query_history
            ORDER BY timestamp DESC
            """
        )
        rows = cursor.fetchall()
        conn.close()
        return [
            HistoryItemResponse(
                id=row["id"],
                question=row["question"],
                sql=row["sql"],
                timestamp=row["timestamp"],
                valid=bool(row["valid"]),
                row_count=row["row_count"],
                execution_duration_ms=row["execution_duration_ms"],
                error=row["error"],
            )
            for row in rows
        ]
    except sqlite3.Error as exc:
        logger.error("[history:get_all] Database error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve history.")


# ---------------------------------------------------------------------------
# POST /api/history - save a new history item
# ---------------------------------------------------------------------------

@router.post("/history", response_model=HistoryItemResponse, status_code=201)
async def create_history(item: HistoryItemCreate):
    """Persist a query history record to the database."""
    try:
        conn = _get_conn()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR REPLACE INTO query_history
                (id, question, sql, timestamp, valid, row_count, execution_duration_ms, error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item.id,
                item.question,
                item.sql,
                item.timestamp,
                1 if item.valid else 0,
                item.row_count,
                item.execution_duration_ms,
                item.error,
            ),
        )
        conn.commit()
        conn.close()
        logger.info("[history:create] Saved history item id=%s", item.id)
        return HistoryItemResponse(
            id=item.id,
            question=item.question,
            sql=item.sql,
            timestamp=item.timestamp,
            valid=item.valid,
            row_count=item.row_count,
            execution_duration_ms=item.execution_duration_ms,
            error=item.error,
        )
    except sqlite3.Error as exc:
        logger.error("[history:create] Database error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to save history item.")


# ---------------------------------------------------------------------------
# DELETE /api/history/{id} - delete a single history item
# ---------------------------------------------------------------------------

@router.delete("/history/{item_id}", response_model=HistoryDeleteResponse)
async def delete_history_item(item_id: str):
    """Permanently delete a single query history record by ID."""
    try:
        conn = _get_conn()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM query_history WHERE id = ?", (item_id,))
        deleted = cursor.rowcount
        conn.commit()
        conn.close()

        if deleted == 0:
            raise HTTPException(status_code=404, detail=f"History item '{item_id}' not found.")

        logger.info("[history:delete] Deleted history item id=%s", item_id)
        return HistoryDeleteResponse(success=True, deleted_id=item_id)
    except HTTPException:
        raise
    except sqlite3.Error as exc:
        logger.error("[history:delete] Database error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to delete history item.")


# ---------------------------------------------------------------------------
# DELETE /api/history - permanently clear all history
# ---------------------------------------------------------------------------

@router.delete("/history", response_model=HistoryDeleteResponse)
async def clear_history():
    """Permanently delete ALL query history records. This action is irreversible."""
    try:
        conn = _get_conn()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM query_history")
        deleted_count = cursor.rowcount
        conn.commit()
        conn.close()
        logger.info("[history:clear_all] Deleted %d history records", deleted_count)
        return HistoryDeleteResponse(success=True, deleted_count=deleted_count)
    except sqlite3.Error as exc:
        logger.error("[history:clear_all] Database error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to clear history.")
