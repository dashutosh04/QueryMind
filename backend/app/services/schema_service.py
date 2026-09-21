"""Schema extraction service - reads the live SQLite database schema."""
import sqlite3
from app.database import get_db_path
from app.schemas import SchemaResponse, TableSchema, ColumnInfo


def get_schema() -> SchemaResponse:
    conn = sqlite3.connect(get_db_path())
    cursor = conn.cursor()

    # Get all user tables (exclude sqlite internal tables)
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    table_names = [row[0] for row in cursor.fetchall()]

    tables = []
    for table_name in table_names:
        cursor.execute(f"PRAGMA table_info({table_name})")
        cols_raw = cursor.fetchall()
        columns = []
        for col in cols_raw:
            # col: (cid, name, type, notnull, dflt_value, pk)
            columns.append(
                ColumnInfo(
                    name=col[1],
                    type=col[2] if col[2] else "TEXT",
                    primary_key=bool(col[5]),
                    nullable=not bool(col[3]),
                )
            )
        tables.append(TableSchema(name=table_name, columns=columns))

    conn.close()
    return SchemaResponse(tables=tables)


def get_schema_as_text() -> str:
    """Return schema as a human-readable text for LLM prompts."""
    schema = get_schema()
    lines = []
    for table in schema.tables:
        lines.append(f"Table: {table.name}")
        for col in table.columns:
            pk_tag = " PRIMARY KEY" if col.primary_key else ""
            null_tag = "" if col.nullable else " NOT NULL"
            lines.append(f"  - {col.name} {col.type}{pk_tag}{null_tag}")
        lines.append("")
    return "\n".join(lines)
