import { BookOpen, Layers, Filter, ArrowUpDown, Cpu, Loader2 } from "lucide-react";
import type { ExplainResponse } from "../types";

interface ExplanationPanelProps {
  explanation: ExplainResponse | null;
  loading: boolean;
}

export default function ExplanationPanel({
  explanation,
  loading,
}: ExplanationPanelProps) {
  if (loading) {
    return (
      <div className="state-loading" style={{ padding: "40px" }}>
        <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent)" }} />
        <span>Synthesizing query execution analysis...</span>
      </div>
    );
  }

  if (!explanation) {
    return (
      <div className="state-empty" style={{ padding: "40px" }}>
        <BookOpen size={24} style={{ opacity: 0.3 }} />
        <p style={{ fontSize: "12.5px" }}>Generate a query to inspect the detailed query plan and breakdown.</p>
      </div>
    );
  }

  const {
    explanation: text,
    tables_used,
    operations,
    filters,
    sorting_grouping,
  } = explanation;

  return (
    <div className="explanation-view">
      {/* Overview Card */}
      <div className="explanation-card">
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <BookOpen size={13} style={{ color: "var(--cyan-text)" }} />
          <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--text-muted)" }}>
            Logic Summary
          </span>
        </div>
        <p className="explanation-summary-text">{text}</p>
      </div>

      {/* Metadata Grid */}
      <div className="metadata-grid">
        {tables_used.length > 0 && (
          <div className="metadata-card">
            <div className="metadata-card-header">
              <Layers size={13} style={{ color: "var(--accent)" }} />
              <span>Target Tables</span>
            </div>
            <div className="tag-list">
              {tables_used.map((t) => (
                <span key={t} className="meta-tag" style={{ color: "var(--accent-text)" }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {operations.length > 0 && (
          <div className="metadata-card">
            <div className="metadata-card-header">
              <Cpu size={13} style={{ color: "var(--cyan-text)" }} />
              <span>Operations</span>
            </div>
            <div className="tag-list">
              {operations.map((op) => (
                <span key={op} className="meta-tag">
                  {op}
                </span>
              ))}
            </div>
          </div>
        )}

        {filters.length > 0 && (
          <div className="metadata-card">
            <div className="metadata-card-header">
              <Filter size={13} style={{ color: "var(--amber-text)" }} />
              <span>Filters & Predicates</span>
            </div>
            <div className="tag-list">
              {filters.map((f) => (
                <span key={f} className="meta-tag" style={{ color: "var(--amber-text)" }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {sorting_grouping.length > 0 && (
          <div className="metadata-card">
            <div className="metadata-card-header">
              <ArrowUpDown size={13} style={{ color: "var(--blue-text)" }} />
              <span>Sort & Group</span>
            </div>
            <div className="tag-list">
              {sorting_grouping.map((s) => (
                <span key={s} className="meta-tag" style={{ color: "var(--blue-text)" }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
