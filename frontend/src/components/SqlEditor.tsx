import { useState } from "react";
import {
  Database,
  Play,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  ShieldAlert,
  CornerDownLeft,
} from "lucide-react";

interface SqlEditorProps {
  sql: string;
  onSqlChange: (sql: string) => void;
  onExecute: (sql: string) => void;
  onClear: () => void;
  executing: boolean;
}

export default function SqlEditor({
  sql,
  onSqlChange,
  onExecute,
  onClear,
  executing,
}: SqlEditorProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!sql.trim()) return;
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (!executing && sql.trim()) onExecute(sql);
    }
  };

  const lineCount = sql ? sql.split("\n").length : 1;

  return (
    <div className="panel">
      {/* Editor Header */}
      <div className="panel-header">
        <div className="panel-header-left">
          <Database size={14} style={{ color: "var(--cyan-text)" }} />
          <span className="panel-title">Direct SQL Console</span>
        </div>
        <div className="panel-header-right">
          <span className="panel-badge">{lineCount} {lineCount === 1 ? "line" : "lines"}</span>
          <span className="panel-badge">SQLite Dialect</span>
        </div>
      </div>

      {/* Editor Body */}
      <div className="sql-editor-container">
        <textarea
          className="sql-code-editor"
          value={sql}
          onChange={(event) => onSqlChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={"-- Write your SELECT query here\nSELECT name, cgpa\nFROM students\nWHERE cgpa >= 8.5\nORDER BY cgpa DESC\nLIMIT 10;"}
          spellCheck={false}
          aria-label="Direct SQL editor"
          disabled={executing}
          rows={7}
        />

        {/* Action & Safety Footer */}
        <div className="sql-actions-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              className="btn-primary"
              onClick={() => onExecute(sql)}
              disabled={executing || !sql.trim()}
              title="Run query (Ctrl+Enter)"
            >
              {executing ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Play size={13} />
                  <span>Run Query</span>
                </>
              )}
            </button>

            <button
              className="btn-secondary"
              onClick={handleCopy}
              disabled={!sql.trim()}
            >
              {copied ? (
                <>
                  <Check size={13} style={{ color: "var(--accent)" }} />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              className="btn-ghost"
              onClick={onClear}
              disabled={executing || !sql}
            >
              <RotateCcw size={13} />
              <span>Clear</span>
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--text-muted)" }}>
              <CornerDownLeft size={11} />
              <span>Ctrl+Enter to run</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--amber-text)" }}>
              <ShieldAlert size={12} />
              <span>SELECT only</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
