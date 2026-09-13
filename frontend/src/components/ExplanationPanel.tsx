import { BookOpen, Table, Filter, SortAsc, Cpu, Loader2 } from "lucide-react";
import type { ExplainResponse } from "../types";

interface ExplanationPanelProps {
  explanation: ExplainResponse | null;
  loading: boolean;
}

function Tag({ label }: { label: string }) {
  return <span className="explain-tag">{label}</span>;
}

export default function ExplanationPanel({ explanation, loading }: ExplanationPanelProps) {
  if (loading) {
    return (
      <div className="panel">
        <div className="panel-header">
          <BookOpen size={16} className="text-violet-400" />
          <h2 className="panel-title">Query Explanation</h2>
        </div>
        <div className="sql-loading">
          <Loader2 size={18} className="animate-spin text-violet-400" />
          <span>Analyzing query…</span>
        </div>
      </div>
    );
  }

  if (!explanation) {
    return (
      <div className="panel">
        <div className="panel-header">
          <BookOpen size={16} className="text-violet-400" />
          <h2 className="panel-title">Query Explanation</h2>
        </div>
        <div className="panel-empty">
          Generate a SQL query to see its explanation.
        </div>
      </div>
    );
  }

  const { explanation: text, tables_used, operations, filters, sorting_grouping } = explanation;

  return (
    <div className="panel">
      <div className="panel-header">
        <BookOpen size={16} className="text-violet-400" />
        <h2 className="panel-title">Query Explanation</h2>
      </div>

      <p className="explain-text">{text}</p>

      <div className="explain-grid">
        {tables_used.length > 0 && (
          <div className="explain-section">
            <div className="explain-section-header">
              <Table size={13} className="text-cyan-400" />
              Tables Used
            </div>
            <div className="explain-tags">
              {tables_used.map((t) => (
                <Tag key={t} label={t} />
              ))}
            </div>
          </div>
        )}

        {operations.length > 0 && (
          <div className="explain-section">
            <div className="explain-section-header">
              <Cpu size={13} className="text-violet-400" />
              Operations
            </div>
            <div className="explain-tags">
              {operations.map((op) => (
                <Tag key={op} label={op} />
              ))}
            </div>
          </div>
        )}

        {filters.length > 0 && (
          <div className="explain-section">
            <div className="explain-section-header">
              <Filter size={13} className="text-amber-400" />
              Filters
            </div>
            <div className="explain-tags">
              {filters.map((f) => (
                <Tag key={f} label={f} />
              ))}
            </div>
          </div>
        )}

        {sorting_grouping.length > 0 && (
          <div className="explain-section">
            <div className="explain-section-header">
              <SortAsc size={13} className="text-emerald-400" />
              Sorting / Grouping
            </div>
            <div className="explain-tags">
              {sorting_grouping.map((s) => (
                <Tag key={s} label={s} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
