import { useState } from "react";
import {
  Code2,
  Copy,
  Check,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import type { GenerateResponse } from "../types";

interface SqlPanelProps {
  result: GenerateResponse | null;
  onExecute: (sql: string) => void;
  onRegenerate: () => void;
  onOpenInEditor?: (sql: string) => void;
  executing: boolean;
  loading: boolean;
}

export default function SqlPanel({
  result,
  onExecute,
  onRegenerate,
  onOpenInEditor,
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
          <div className="panel-header-left">
            <Code2 size={14} style={{ color: "var(--cyan-text)" }} />
            <span className="panel-title">Generated SQL Inspector</span>
          </div>
        </div>
        <div className="state-loading">
          <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent)" }} />
          <span>Generating and validating SQL syntax via LangGraph...</span>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="panel">
        <div className="panel-header">
          <div className="panel-header-left">
            <Code2 size={14} style={{ color: "var(--text-muted)" }} />
            <span className="panel-title">Generated SQL Inspector</span>
          </div>
          <div className="panel-header-right">
            <span className="panel-badge">Awaiting Input</span>
          </div>
        </div>
        <div className="state-empty">
          <Code2 size={24} style={{ opacity: 0.3 }} />
          <p style={{ fontSize: "12.5px" }}>Submit a natural language prompt above to inspect generated SQLite syntax.</p>
        </div>
      </div>
    );
  }

  const { sql, validation, revised, revision_attempts, is_ambiguous, reasoning, duration_ms } = result;
  const lines = sql ? sql.split("\n") : [];

  return (
    <div className="panel">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-header-left">
          <Code2 size={14} style={{ color: "var(--cyan-text)" }} />
          <span className="panel-title">Generated SQL Inspector</span>

          {validation.valid ? (
            <span className="status-badge valid">
              <CheckCircle2 size={11} />
              <span>Valid SQLite</span>
            </span>
          ) : (
            <span className="status-badge invalid">
              <XCircle size={11} />
              <span>Syntax Error</span>
            </span>
          )}

          {revised && (
            <span className="status-badge revised" title={`Auto-revised ${revision_attempts} times`}>
              <AlertTriangle size={11} />
              <span>Auto-Revised ({revision_attempts}x)</span>
            </span>
          )}
        </div>

        <div className="panel-header-right" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {duration_ms > 0 && (
            <span className="panel-badge" style={{ fontFamily: "JetBrains Mono, monospace" }}>{duration_ms}ms</span>
          )}
          {sql && <span className="panel-badge">{lines.length} {lines.length === 1 ? "line" : "lines"}</span>}
        </div>
      </div>

      {/* Reasoning note */}
      {reasoning && (
        <div style={{
          padding: "8px 14px",
          fontSize: "11.5px",
          color: "var(--text-muted)",
          borderBottom: "1px solid var(--border-subtle)",
          fontStyle: "italic",
          lineHeight: 1.5,
        }}>
          <strong style={{ fontStyle: "normal", color: "var(--text-secondary)" }}>AI reasoning:</strong>{" "}{reasoning}
        </div>
      )}

      {/* Code Viewer with Line Numbers */}
      <div className="sql-editor-container">
        {is_ambiguous ? (
          <div className="state-empty" style={{ padding: "32px 20px" }}>
            <p style={{ fontSize: "13px", color: "var(--amber-text, #fbbf24)" }}>This question needs clarification before SQL can be generated.</p>
          </div>
        ) : (
        <div style={{ display: "flex", width: "100%", overflowX: "auto" }}>
          <div
            style={{
              padding: "12px 10px",
              backgroundColor: "var(--bg-surface)",
              borderRight: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "12px",
              lineHeight: "1.6",
              textAlign: "right",
              userSelect: "none",
            }}
          >
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <pre className="sql-code-view" style={{ flex: 1 }}>
            <code>{sql}</code>
          </pre>
        </div>
        )}

        {/* Validation Error Details */}
        {!validation.valid && validation.error && !is_ambiguous && (
          <div className="validation-error-callout">
            <XCircle size={14} style={{ flexShrink: 0, marginTop: "1px" }} />
            <div>
              <strong>Validation Failure:</strong> {validation.error}
            </div>
          </div>
        )}

        {/* SQL Actions Bar */}
        <div className="sql-actions-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              className="btn-primary"
              onClick={() => onExecute(sql)}
              disabled={executing || !validation.valid}
              title="Execute this query against SQLite database"
            >
              {executing ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Executing Query...</span>
                </>
              ) : (
                <>
                  <Play size={13} />
                  <span>Run Query</span>
                </>
              )}
            </button>

            <button className="btn-secondary" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check size={13} style={{ color: "var(--accent)" }} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy SQL</span>
                </>
              )}
            </button>

            {onOpenInEditor && (
              <button
                className="btn-ghost"
                onClick={() => onOpenInEditor(sql)}
                title="Open in manual SQL workspace"
              >
                <ExternalLink size={13} />
                <span>Edit in SQL Console</span>
              </button>
            )}
          </div>

          <button
            className="btn-ghost"
            onClick={onRegenerate}
            disabled={loading}
            title="Re-run AI generation for this prompt"
          >
            <RefreshCw size={13} />
            <span>Regenerate</span>
          </button>
        </div>
      </div>
    </div>
  );
}
