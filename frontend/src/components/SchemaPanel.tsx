import { useState, useMemo } from "react";
import {
  Database,
  ChevronDown,
  ChevronRight,
  Key,
  Search,
  Play,
  TableProperties,
} from "lucide-react";
import type { SchemaResponse, TableSchema } from "../types";

interface SchemaPanelProps {
  schema: SchemaResponse | null;
  loading: boolean;
  error: string | null;
  onQueryTable?: (tableName: string) => void;
}

function TableNode({
  table,
  onQueryTable,
  defaultOpen,
}: {
  table: TableSchema;
  onQueryTable?: (tableName: string) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="schema-table-node">
      <div className="schema-table-toggle">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "inherit", cursor: "pointer", flex: 1, textAlign: "left" }}
        >
          {open ? (
            <ChevronDown size={13} style={{ color: "var(--text-muted)" }} />
          ) : (
            <ChevronRight size={13} style={{ color: "var(--text-muted)" }} />
          )}
          <span className="table-node-name">
            <TableProperties size={13} style={{ color: "var(--cyan-text)" }} />
            <span>{table.name}</span>
          </span>
        </button>

        <div className="table-node-actions">
          <span className="panel-badge">{table.columns.length} cols</span>
          {onQueryTable && (
            <button
              type="button"
              className="btn-icon-only"
              onClick={() => onQueryTable(table.name)}
              title={`Query ${table.name}`}
            >
              <Play size={11} style={{ color: "var(--accent)" }} />
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="schema-column-list">
          {table.columns.map((col) => (
            <div key={col.name} className="schema-column-row">
              <div className={`col-name-box ${col.primary_key ? "is-pk" : ""}`}>
                {col.primary_key ? (
                  <Key size={10} style={{ color: "var(--amber-text)" }} />
                ) : (
                  <span style={{ width: "10px", display: "inline-block", textAlign: "center", color: "var(--border-strong)" }}>•</span>
                )}
                <span>{col.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span className="col-type-tag">{col.type}</span>
                {!col.nullable && (
                  <span style={{ fontSize: "9px", padding: "1px 4px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "2px", color: "var(--text-muted)" }}>
                    NN
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SchemaPanel({
  schema,
  loading,
  error,
  onQueryTable,
}: SchemaPanelProps) {
  const [search, setSearch] = useState("");

  const filteredTables = useMemo(() => {
    if (!schema?.tables) return [];
    if (!search.trim()) return schema.tables;
    const q = search.toLowerCase();
    return schema.tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.columns.some((c) => c.name.toLowerCase().includes(q))
    );
  }, [schema, search]);

  if (loading) {
    return (
      <div className="schema-panel">
        <div className="panel-header">
          <div className="panel-header-left">
            <Database size={14} style={{ color: "var(--cyan-text)" }} />
            <span className="panel-title">Database Schema</span>
          </div>
        </div>
        <div className="state-loading">
          <span>Loading live schema...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="schema-panel">
        <div className="panel-header">
          <div className="panel-header-left">
            <Database size={14} style={{ color: "var(--red-text)" }} />
            <span className="panel-title">Database Schema</span>
          </div>
        </div>
        <div className="validation-error-callout" style={{ margin: "12px" }}>
          <span>Failed to inspect schema: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="schema-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-header-left">
          <Database size={14} style={{ color: "var(--cyan-text)" }} />
          <span className="panel-title">Database Schema</span>
        </div>
        <div className="panel-header-right">
          <span className="panel-badge">{schema?.tables.length ?? 0} tables</span>
        </div>
      </div>

      {/* Instant Search Filter */}
      <div className="schema-search-bar">
        <div className="search-input-box">
          <Search size={12} />
          <input
            type="text"
            className="search-input"
            placeholder="Search tables or columns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Schema Tree */}
      <div className="schema-tree-scroll">
        {filteredTables.length === 0 ? (
          <div className="state-empty" style={{ padding: "20px" }}>
            <span style={{ fontSize: "11px" }}>No matching tables found</span>
          </div>
        ) : (
          filteredTables.map((table) => (
            <TableNode
              key={table.name}
              table={table}
              onQueryTable={onQueryTable}
              defaultOpen={filteredTables.length <= 4}
            />
          ))
        )}
      </div>
    </div>
  );
}
