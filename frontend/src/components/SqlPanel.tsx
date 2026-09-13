import { useState } from "react";
import {
  Code2,
  Copy,
  Check,
  RefreshCw,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { GenerateResponse } from "../types";

interface SqlPanelProps {
  result: GenerateResponse | null;
  onExecute: (sql: string) => void;
  onRegenerate: () => void;
  executing: boolean;
  loading: boolean;
}

export default function SqlPanel({
  result,
  onExecute,
  onRegenerate,
  executing,
  loading,
}: SqlPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!result?.sql) return;
    await navigator.clipboard.writeText(result.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-header">
          <Code2 size={16} className="text-violet-400" />
          <h2 className="panel-title">Generated SQL</h2>
        </div>
        <div className="sql-loading">
          <Loader2 size={20} className="animate-spin text-violet-400" />
          <span>Generating SQL with Groq AI…</span>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="panel">
        <div className="panel-header">
          <Code2 size={16} className="text-violet-400" />
          <h2 className="panel-title">Generated SQL</h2>
        </div>
        <div className="panel-empty">
          Enter a natural language question above and click Generate SQL.
        </div>
      </div>
    );
  }

  const { sql, validation, revised, revision_attempts } = result;

  return (
    <div className="panel">
      <div className="panel-header">
        <Code2 size={16} className="text-violet-400" />
        <h2 className="panel-title">Generated SQL</h2>

        {/* Validation badge */}
        {validation.valid ? (
          <div className="badge-valid">
            <CheckCircle size={12} />
            Valid
          </div>
        ) : (
          <div className="badge-invalid">
            <XCircle size={12} />
            Invalid
          </div>
        )}

        {revised && (
          <div className="badge-revised">
            <AlertCircle size={12} />
            Revised ×{revision_attempts}
          </div>
        )}
      </div>

      {/* SQL code block */}
      <div className="sql-block">
        <pre className="sql-code">{sql}</pre>
      </div>

      {/* Validation error */}
      {!validation.valid && validation.error && (
        <div className="validation-error">
          <XCircle size={13} />
          {validation.error}
        </div>
      )}

      {/* Actions */}
      <div className="sql-actions">
        <button
          className="btn-primary"
          onClick={() => onExecute(sql)}
          disabled={executing || !validation.valid}
        >
          {executing ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Executing…
            </>
          ) : (
            <>
              <Play size={14} />
              Run Query
            </>
          )}
        </button>

        <button className="btn-secondary" onClick={handleCopy}>
          {copied ? (
            <>
              <Check size={14} className="text-emerald-400" />
              Copied!
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy SQL
            </>
          )}
        </button>

        <button className="btn-ghost" onClick={onRegenerate} disabled={loading}>
          <RefreshCw size={14} />
          Regenerate
        </button>
      </div>
    </div>
  );
}
