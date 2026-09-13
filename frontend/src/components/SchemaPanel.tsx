import { Database, ChevronDown, ChevronRight, Key, Minus } from "lucide-react";
import { useState } from "react";
import type { SchemaResponse, TableSchema } from "../types";

interface SchemaPanelProps {
  schema: SchemaResponse | null;
  loading: boolean;
  error: string | null;
}

function TableCard({ table }: { table: TableSchema }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="schema-table">
      <button className="schema-table-header" onClick={() => setOpen((p) => !p)}>
        <Database size={13} className="text-violet-400" />
        <span className="schema-table-name">{table.name}</span>
        <span className="schema-col-count">{table.columns.length} cols</span>
        {open ? (
          <ChevronDown size={13} className="ml-auto opacity-60" />
        ) : (
          <ChevronRight size={13} className="ml-auto opacity-60" />
        )}
      </button>
      {open && (
        <div className="schema-columns">
          {table.columns.map((col) => (
            <div key={col.name} className="schema-col">
              <div className="schema-col-left">
                {col.primary_key ? (
                  <Key size={10} className="text-amber-400 flex-shrink-0" />
                ) : (
                  <Minus size={10} className="opacity-30 flex-shrink-0" />
                )}
                <span className={`schema-col-name ${col.primary_key ? "text-amber-300" : ""}`}>
                  {col.name}
                </span>
              </div>
              <div className="schema-col-right">
                <span className="schema-type">{col.type}</span>
                {!col.nullable && (
                  <span className="schema-badge">NOT NULL</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SchemaPanel({ schema, loading, error }: SchemaPanelProps) {
  if (loading) {
    return (
      <div className="panel">
        <div className="panel-header">
          <Database size={16} className="text-violet-400" />
          <h2 className="panel-title">Database Schema</h2>
        </div>
        <div className="panel-loading">Loading schema…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel">
        <div className="panel-header">
          <Database size={16} className="text-violet-400" />
          <h2 className="panel-title">Database Schema</h2>
        </div>
        <div className="panel-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <Database size={16} className="text-violet-400" />
        <h2 className="panel-title">Database Schema</h2>
        <span className="panel-badge">{schema?.tables.length ?? 0} tables</span>
      </div>
      <div className="schema-list">
        {schema?.tables.map((table) => (
          <TableCard key={table.name} table={table} />
        ))}
      </div>
    </div>
  );
}
