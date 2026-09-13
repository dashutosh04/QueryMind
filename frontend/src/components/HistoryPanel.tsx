import { History, Clock, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import type { QueryHistoryEntry } from "../types";

interface HistoryPanelProps {
  history: QueryHistoryEntry[];
  onSelect: (entry: QueryHistoryEntry) => void;
}

export default function HistoryPanel({ history, onSelect }: HistoryPanelProps) {
  if (history.length === 0) {
    return (
      <div className="panel">
        <div className="panel-header">
          <History size={16} className="text-violet-400" />
          <h2 className="panel-title">Query History</h2>
        </div>
        <div className="panel-empty">
          No queries yet. Generate a SQL query to see history.
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <History size={16} className="text-violet-400" />
        <h2 className="panel-title">Query History</h2>
        <span className="panel-badge">{history.length}</span>
      </div>

      <div className="history-full-list">
        {[...history].reverse().map((entry) => (
          <div key={entry.id} className="history-full-item">
            <div className="history-full-header">
              <div className="history-full-status">
                {entry.valid ? (
                  <CheckCircle size={13} className="text-emerald-400" />
                ) : (
                  <XCircle size={13} className="text-red-400" />
                )}
                <span className="history-full-question">{entry.question}</span>
              </div>
              <div className="history-full-time">
                <Clock size={11} />
                {new Date(entry.timestamp).toLocaleTimeString()}
              </div>
            </div>
            <pre className="history-full-sql">{entry.sql}</pre>
            <button
              className="history-use-btn"
              onClick={() => onSelect(entry)}
            >
              Use this query
              <ArrowRight size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
