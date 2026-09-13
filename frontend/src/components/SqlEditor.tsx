import { useState } from "react";
import { Check, Clipboard, Database, Loader2, Play, RotateCcw } from "lucide-react";

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

  return (
    <div className="panel editor-panel">
      <div className="panel-header">
        <Database size={16} className="text-cyan-400" />
        <div>
          <h2 className="panel-title">SQL workspace</h2>
          <p className="panel-subtitle">Write, inspect, and run a read-only query</p>
        </div>
        <span className="panel-hint">Ctrl+Enter to run</span>
      </div>

      <textarea
        className="sql-editor"
        value={sql}
        onChange={(event) => onSqlChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={'SELECT name, cgpa\nFROM students\nORDER BY cgpa DESC;'}
        spellCheck={false}
        aria-label="SQL command editor"
        disabled={executing}
      />

      <div className="editor-footer">
        <span className="editor-safety-note">Only SELECT statements can be executed</span>
        <div className="sql-actions">
          <button className="btn-primary" onClick={() => onExecute(sql)} disabled={executing || !sql.trim()}>
            {executing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {executing ? "Running..." : "Run query"}
          </button>
          <button className="btn-secondary" onClick={handleCopy} disabled={!sql.trim()}>
            {copied ? <Check size={14} className="text-emerald-400" /> : <Clipboard size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button className="btn-ghost" onClick={onClear} disabled={executing || !sql}>
            <RotateCcw size={14} />
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
