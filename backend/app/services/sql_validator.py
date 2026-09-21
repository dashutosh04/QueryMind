"""SQL safety validation - only allow safe SELECT queries."""
import re
import sqlite3
from app.database import get_db_path

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


def validate_sql_safety(sql: str) -> dict:
    """
    Check that the SQL is a safe SELECT-only statement.
    Returns {'safe': bool, 'error': str | None}
    """
    stripped = sql.strip()

    if not stripped:
        return {"safe": False, "error": "SQL query is empty."}

    # CTEs are read-only when their final statement is SELECT. Forbidden
    # keyword checks below still reject data-changing CTE bodies.
    if not re.match(r"^\s*(?:SELECT|WITH)\b", stripped, re.IGNORECASE):
        return {"safe": False, "error": "Only SELECT queries are allowed."}

    # Reject forbidden operations
    for pattern in FORBIDDEN_PATTERNS:
        if re.search(pattern, stripped, re.IGNORECASE):
            keyword = re.search(pattern, stripped, re.IGNORECASE)
            found = keyword.group(0) if keyword else pattern
            return {"safe": False, "error": f"Forbidden keyword detected: {found}"}

    # Reject multiple statements (semicolons in the middle)
    # Allow trailing semicolon only
    trimmed = stripped[:-1].strip() if stripped.endswith(";") else stripped
    if ";" in trimmed:
        return {"safe": False, "error": "Multiple SQL statements are not allowed."}

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
        return {"valid": False, "error": f"Unexpected error: {str(e)}"}
