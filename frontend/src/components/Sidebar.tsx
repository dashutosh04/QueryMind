import { useState } from "react";
import {
  Brain,
  Plus,
  History,
  Database,
  Info,
  CheckCircle,
  XCircle,
  ChevronRight,
  Clock,
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
  const [historyOpen, setHistoryOpen] = useState(false);

  const navItems = [
    { id: "query", label: "Query", icon: Brain },
    { id: "schema", label: "Schema", icon: Database },
    { id: "about", label: "About", icon: Info },
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Brain size={20} className="text-violet-400" />
        </div>
        <div>
          <div className="logo-title">QueryMind</div>
          <div className="logo-sub">AI SQL Generator</div>
        </div>
      </div>

      {/* New Query button */}
      <button className="new-query-btn" onClick={onNewQuery}>
        <Plus size={16} />
        New Query
      </button>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item ${activeSection === id ? "nav-item-active" : ""}`}
            onClick={() => onSectionChange(id)}
          >
            <Icon size={16} />
            {label}
            {activeSection === id && <ChevronRight size={14} className="ml-auto" />}
          </button>
        ))}
      </nav>

      {/* History Section */}
      <div className="sidebar-section">
        <button
          className="section-header"
          onClick={() => setHistoryOpen((p) => !p)}
        >
          <History size={14} />
          <span>History ({history.length})</span>
          <ChevronRight
            size={12}
            className={`ml-auto transition-transform ${historyOpen ? "rotate-90" : ""}`}
          />
        </button>

        {historyOpen && history.length === 0 && (
          <div className="history-empty">No queries yet</div>
        )}

        {historyOpen && (
          <div className="history-list">
            {history.map((entry) => (
              <button
                key={entry.id}
                className="history-item"
                onClick={() => onSelectHistory(entry)}
              >
                <div className="history-question">{entry.question}</div>
                <div className="history-meta">
                  <Clock size={10} />
                  {new Date(entry.timestamp).toLocaleTimeString()}
                  {entry.valid ? (
                    <CheckCircle size={10} className="text-emerald-400 ml-1" />
                  ) : (
                    <XCircle size={10} className="text-red-400 ml-1" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Backend status */}
      <div className="sidebar-footer">
        <div className={`status-dot ${backendOnline ? "status-online" : "status-offline"}`} />
        <span className="status-label">
          Backend {backendOnline ? "Online" : "Offline"}
        </span>
      </div>
    </aside>
  );
}
