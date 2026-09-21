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
} from "lucide-react";
import type { QueryHistoryEntry } from "../types";

interface HistoryPanelProps {
  history: QueryHistoryEntry[];
  onSelect: (entry: QueryHistoryEntry) => void;
}

export default function HistoryPanel({ history, onSelect }: HistoryPanelProps) {
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, sql: string) => {
    await navigator.clipboard.writeText(sql);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredHistory = useMemo(() => {
    if (!search.trim()) return [...history].reverse();
    const q = search.toLowerCase();
    return [...history].reverse().filter(
      (entry) =>
        entry.question.toLowerCase().includes(q) ||
        entry.sql.toLowerCase().includes(q)
    );
  }, [history, search]);

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
            <p style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>Executed queries in this session will appear here.</p>
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
          <div className="panel-header-right">
            <span className="panel-badge">{history.length} logged</span>
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
          {filteredHistory.map((entry) => (
            <div key={entry.id} className="history-card-item">
              <div className="history-card-header">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {entry.valid ? (
                    <span className="status-badge valid">
                      <CheckCircle2 size={11} />
                      <span>Valid</span>
                    </span>
                  ) : (
                    <span className="status-badge invalid">
                      <XCircle size={11} />
                      <span>Failed</span>
                    </span>
                  )}
                  <strong style={{ fontSize: "13px", color: "var(--text-primary)" }}>{entry.question}</strong>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
                  <Clock size={11} />
                  <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              <pre className="history-card-sql">{entry.sql}</pre>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
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
          ))}
        </div>
      </div>
    </div>
  );
}
