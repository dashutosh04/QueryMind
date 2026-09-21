import { useState, useMemo } from "react";
import {
  History,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Search,
  Copy,
  Check,
  Trash2,
  RotateCcw,
  Loader2,
} from "lucide-react";
import type { QueryHistoryEntry } from "../types";

interface HistoryPanelProps {
  history: QueryHistoryEntry[];
  loading?: boolean;
  onSelect: (entry: QueryHistoryEntry) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export default function HistoryPanel({
  history,
  loading = false,
  onSelect,
  onDelete,
  onClearAll,
}: HistoryPanelProps) {
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleCopy = async (id: string, sql: string) => {
    await navigator.clipboard.writeText(sql);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearClick = () => {
    if (confirmClear) {
      onClearAll();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  const filteredHistory = useMemo(() => {
    if (!search.trim()) return history;
    const q = search.toLowerCase();
    return history.filter(
      (entry) =>
        entry.question.toLowerCase().includes(q) ||
        entry.sql.toLowerCase().includes(q)
    );
  }, [history, search]);

  if (loading) {
    return (
      <div className="full-page-view">
        <div className="panel" style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--border-base)" }}>
          <div className="panel-header">
            <div className="panel-header-left">
              <History size={14} style={{ color: "var(--cyan-text)" }} />
              <span className="panel-title">Query Execution History</span>
            </div>
          </div>
          <div className="state-empty" style={{ padding: "60px 20px" }}>
            <Loader2 size={24} style={{ opacity: 0.5, animation: "spin 1s linear infinite" }} />
            <p style={{ fontSize: "13px", marginTop: "8px" }}>Loading history...</p>
          </div>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="full-page-view">
        <div className="panel" style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--border-base)" }}>
          <div className="panel-header">
            <div className="panel-header-left">
              <History size={14} style={{ color: "var(--cyan-text)" }} />
              <span className="panel-title">Query Execution History</span>
            </div>
          </div>
          <div className="state-empty" style={{ padding: "60px 20px" }}>
            <History size={32} style={{ opacity: 0.3 }} />
            <p style={{ fontSize: "13px", marginTop: "8px" }}>No query history recorded yet.</p>
            <p style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>Executed queries will be persisted here across sessions.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="full-page-view">
      <div className="panel" style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--border-base)", overflow: "hidden" }}>
        {/* Header */}
        <div className="panel-header">
          <div className="panel-header-left">
            <History size={14} style={{ color: "var(--cyan-text)" }} />
            <span className="panel-title">Query Execution History</span>
          </div>
          <div className="panel-header-right" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="panel-badge">{history.length} entries</span>
            <button
              className="btn-secondary"
              style={{ padding: "3px 10px", fontSize: "11px", color: confirmClear ? "var(--red-text, #f87171)" : undefined }}
              onClick={handleClearClick}
              title="Clear all history"
            >
              <RotateCcw size={11} />
              <span>{confirmClear ? "Click to confirm" : "Clear All"}</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="schema-search-bar">
          <div className="search-input-box">
            <Search size={12} />
            <input
              type="text"
              className="search-input"
              placeholder="Search history by question or SQL query..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* History List */}
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {filteredHistory.length === 0 ? (
            <div className="state-empty" style={{ padding: "40px 0" }}>
              <p style={{ fontSize: "13px" }}>No results match your search.</p>
            </div>
          ) : (
            filteredHistory.map((entry) => (
              <div key={entry.id} className="history-card-item">
                <div className="history-card-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                    {entry.valid ? (
                      <span className="status-badge valid" style={{ flexShrink: 0 }}>
                        <CheckCircle2 size={11} />
                        <span>Valid</span>
                      </span>
                    ) : (
                      <span className="status-badge invalid" style={{ flexShrink: 0 }}>
                        <XCircle size={11} />
                        <span>Failed</span>
                      </span>
                    )}
                    <strong style={{ fontSize: "13px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.question}
                    </strong>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                    {/* Metadata chips */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
                      <Clock size={11} />
                      <span>{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                    {entry.row_count !== null && entry.row_count !== undefined && (
                      <span className="panel-badge">{entry.row_count} rows</span>
                    )}
                    {entry.execution_duration_ms !== null && entry.execution_duration_ms !== undefined && (
                      <span className="panel-badge" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        {Math.round(entry.execution_duration_ms)}ms
                      </span>
                    )}
                    {/* Delete button */}
                    <button
                      className="btn-secondary"
                      style={{ padding: "3px 8px", fontSize: "11px" }}
                      onClick={() => onDelete(entry.id)}
                      title="Delete this entry"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                <pre className="history-card-sql">{entry.sql}</pre>

                {entry.error && (
                  <p style={{ fontSize: "11px", color: "var(--red-text, #f87171)", margin: "4px 0 0", fontFamily: "JetBrains Mono, monospace" }}>
                    {entry.error}
                  </p>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
                  <button
                    className="btn-secondary"
                    style={{ padding: "4px 10px", fontSize: "11px" }}
                    onClick={() => handleCopy(entry.id, entry.sql)}
                  >
                    {copiedId === entry.id ? <Check size={11} style={{ color: "var(--accent)" }} /> : <Copy size={11} />}
                    <span>{copiedId === entry.id ? "Copied" : "Copy SQL"}</span>
                  </button>

                  <button
                    className="btn-primary"
                    style={{ padding: "4px 12px", fontSize: "11px" }}
                    onClick={() => onSelect(entry)}
                  >
                    <span>Load into Console</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
