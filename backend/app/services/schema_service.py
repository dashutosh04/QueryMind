"""Schema extraction service - reads the live SQLite database schema."""
import sqlite3
from app.database import get_db_path
from app.schemas import SchemaResponse, TableSchema, ColumnInfo, ForeignKeyInfo

# Tables excluded from natural language query prompts and schema explorer
SYSTEM_TABLES = {"query_history"}


def get_schema() -> SchemaResponse:
    conn = sqlite3.connect(get_db_path())
    cursor = conn.cursor()

    # Get all user tables (exclude sqlite internal tables and system query_history)
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    all_table_names = [row[0] for row in cursor.fetchall()]
    table_names = [t for t in all_table_names if t not in SYSTEM_TABLES]

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
                    nullable=not bool(col[3]) and not bool(col[5]),
                )
            )

        # Retrieve foreign keys
        cursor.execute(f"PRAGMA foreign_key_list({table_name})")
        fks_raw = cursor.fetchall()
        foreign_keys = []
        for fk in fks_raw:
            # fk: (id, seq, table, from, to, on_update, on_delete, match)
            foreign_keys.append(
                ForeignKeyInfo(
                    column=fk[3],
                    referred_table=fk[2],
                    referred_column=fk[4] if fk[4] else "id",
                )
            )

        tables.append(TableSchema(name=table_name, columns=columns, foreign_keys=foreign_keys))

    conn.close()
    return SchemaResponse(tables=tables)


def get_known_tables() -> set[str]:
    """Return set of valid user table names."""
    schema = get_schema()
    return {table.name.lower() for table in schema.tables}


def get_known_columns() -> dict[str, set[str]]:
    """Return mapping of table_name -> set of column_names."""
    schema = get_schema()
    mapping: dict[str, set[str]] = {}
    for table in schema.tables:
        mapping[table.name.lower()] = {col.name.lower() for col in table.columns}
    return mapping


def get_schema_as_text() -> str:
    """Return schema with relationships as clean text for LLM prompts."""
    schema = get_schema()
    lines = []
    for table in schema.tables:
        lines.append(f"Table: {table.name}")
        for col in table.columns:
            pk_tag = " PRIMARY KEY" if col.primary_key else ""
            null_tag = "" if col.nullable else " NOT NULL"
            lines.append(f"  - {col.name} ({col.type}){pk_tag}{null_tag}")

        if table.foreign_keys:
            for fk in table.foreign_keys:
                lines.append(f"  - Foreign Key: {fk.column} REFERENCES {fk.referred_table}({fk.referred_column})")

        lines.append("")
    return "\n".join(lines).strip()
