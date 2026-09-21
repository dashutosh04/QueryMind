import { useState } from "react";
import {
  Terminal,
  Database,
  History,
  ShieldCheck,
  Plus,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  HardDrive,
} from "lucide-react";
import type { QueryHistoryEntry } from "../types";

interface SidebarProps {
  history: QueryHistoryEntry[];
  backendOnline: boolean;
  onNewQuery: () => void;
  onSelectHistory: (entry: QueryHistoryEntry) => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export default function Sidebar({
  history,
  backendOnline,
  onNewQuery,
  onSelectHistory,
  activeSection,
  onSectionChange,
}: SidebarProps) {
  const [historyOpen, setHistoryOpen] = useState(true);

  const navItems = [
    { id: "query", label: "Query Console", icon: Terminal },
    { id: "schema", label: "Schema Explorer", icon: Database },
    { id: "history", label: "Query History", icon: History },
    { id: "about", label: "Architecture & Safety", icon: ShieldCheck },
  ];

  return (
    <aside className="sidebar">
      {/* Action Header */}
      <div className="sidebar-header">
        <button
          className="sidebar-action-btn"
          onClick={onNewQuery}
          title="Start a new query (Ctrl+N)"
        >
          <div className="action-btn-left">
            <Plus size={14} />
            <span>New Query</span>
          </div>
          <span className="kbd-shortcut">Ctrl+N</span>
        </button>
      </div>

      {/* Navigation Group */}
      <nav className="sidebar-nav-group" aria-label="Main Navigation">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`sidebar-nav-item ${activeSection === id ? "active" : ""}`}
            onClick={() => onSectionChange(id)}
          >
            <Icon size={15} className="nav-icon" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Recent History Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>Recent Queries ({history.length})</span>
          <button
            className="btn-icon-only"
            onClick={() => setHistoryOpen((prev) => !prev)}
            title={historyOpen ? "Collapse history" : "Expand history"}
          >
            <ChevronRight
              size={13}
              style={{
                transform: historyOpen ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease",
              }}
            />
          </button>
        </div>

        {historyOpen && (
          <div className="sidebar-history-scroll">
            {history.length === 0 ? (
              <div className="state-empty" style={{ padding: "16px 8px" }}>
                <Clock size={16} />
                <span style={{ fontSize: "11px" }}>No recent queries</span>
              </div>
            ) : (
              [...history].reverse().slice(0, 10).map((entry) => (
                <button
                  key={entry.id}
                  className="history-snippet-item"
                  onClick={() => onSelectHistory(entry)}
                  title={entry.question}
                >
                  <span className="history-snippet-text">{entry.question}</span>
                  <div className="history-snippet-meta">
                    {entry.valid ? (
                      <CheckCircle2 size={11} style={{ color: "var(--accent)" }} />
                    ) : (
                      <XCircle size={11} style={{ color: "var(--red)" }} />
                    )}
                    <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Connection Footer */}
      <div className="sidebar-footer">
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div className={`status-indicator-dot ${backendOnline ? "online" : "offline"}`} />
          <span style={{ fontSize: "11px", fontFamily: "JetBrains Mono, monospace" }}>
            {backendOnline ? "SQLite Active" : "Disconnected"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-muted)" }}>
          <HardDrive size={12} />
          <span style={{ fontSize: "10.5px", fontFamily: "JetBrains Mono, monospace" }}>Local</span>
        </div>
      </div>
    </aside>
  );
}
