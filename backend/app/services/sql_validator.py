"""SQL safety validation - only allow safe SELECT queries."""
import re
import sqlite3
from app.database import get_db_path
from app.services.schema_service import get_known_tables

# Forbidden keywords (case-insensitive, word-boundary matched)
FORBIDDEN_PATTERNS = [
    r"\bINSERT\b",
    r"\bUPDATE\b",
    r"\bDELETE\b",
    r"\bDROP\b",
    r"\bALTER\b",
    r"\bCREATE\b",
    r"\bATTACH\b",
    r"\bDETACH\b",
    r"\bPRAGMA\b",
    r"\bTRUNCATE\b",
    r"\bREPLACE\b",
    r"\bMERGE\b",
    r"\bEXEC\b",
    r"\bEXECUTE\b",
    r"\bxp_\w+",          # SQL Server extended procs (paranoia)
    r"--",                # SQL comment injection
    r"/\*",               # Block comment injection
]

SYSTEM_TABLES = {"query_history", "sqlite_master", "sqlite_sequence"}


def extract_table_references(sql: str) -> list[str]:
    """Extract table names referenced in FROM and JOIN clauses."""
    # Pattern to extract table names: FROM table_name or JOIN table_name
    matches = re.findall(
        r"(?:FROM|JOIN)\s+([a-zA-Z0-9_]+)",
        sql,
        re.IGNORECASE,
    )
    return [m.lower() for m in matches]


def validate_sql_safety(sql: str) -> dict:
    """
    Check that the SQL is a safe SELECT-only statement and references known tables.
    Returns {'safe': bool, 'error': str | None}
    """
    stripped = sql.strip()

    if not stripped:
        return {"safe": False, "error": "SQL query is empty."}

    # CTEs are read-only when their final statement is SELECT
    if not re.match(r"^\s*(?:SELECT|WITH)\b", stripped, re.IGNORECASE):
        return {"safe": False, "error": "Only SELECT queries are allowed."}

    # Reject forbidden operations
    for pattern in FORBIDDEN_PATTERNS:
        match = re.search(pattern, stripped, re.IGNORECASE)
        if match:
            found = match.group(0)
            return {"safe": False, "error": f"Forbidden operation or token detected: {found}"}

    # Reject multiple statements (semicolons in the middle)
    trimmed = stripped[:-1].strip() if stripped.endswith(";") else stripped
    if ";" in trimmed:
        return {"safe": False, "error": "Multiple SQL statements are not allowed."}

    # Verify referenced tables
    known_tables = get_known_tables()
    referenced_tables = extract_table_references(stripped)

    for table in referenced_tables:
        if table in SYSTEM_TABLES:
            return {"safe": False, "error": f"Access to internal table '{table}' is prohibited."}
        # Ignore subquery aliases or common keywords if matched accidentally
        if table in {"select", "where", "group", "order", "limit"}:
            continue
        if known_tables and table not in known_tables:
            avail = ", ".join(sorted(known_tables))
            return {
                "safe": False,
                "error": f"Table '{table}' does not exist in the database schema. Available tables: {avail}.",
            }

    return {"safe": True, "error": None}


def validate_sql_syntax(sql: str) -> dict:
    """
    Validate SQL syntax by running EXPLAIN QUERY PLAN against SQLite.
    Returns {'valid': bool, 'error': str | None}
    """
    try:
        conn = sqlite3.connect(get_db_path())
        cursor = conn.cursor()
        cursor.execute(f"EXPLAIN QUERY PLAN {sql}")
        conn.close()
        return {"valid": True, "error": None}
    except sqlite3.Error as e:
        return {"valid": False, "error": str(e)}
    except Exception as e:
        return {"valid": False, "error": f"Unexpected validation error: {str(e)}"}
