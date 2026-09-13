import { TableIcon, Loader2, XCircle } from "lucide-react";
import type { ExecuteResponse } from "../types";

interface ResultsTableProps {
  result: ExecuteResponse | null;
  loading: boolean;
}

export default function ResultsTable({ result, loading }: ResultsTableProps) {
  if (loading) {
    return (
      <div className="panel">
        <div className="panel-header">
          <TableIcon size={16} className="text-violet-400" />
          <h2 className="panel-title">Query Results</h2>
        </div>
        <div className="sql-loading">
          <Loader2 size={18} className="animate-spin text-violet-400" />
          <span>Executing query…</span>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="panel">
        <div className="panel-header">
          <TableIcon size={16} className="text-violet-400" />
          <h2 className="panel-title">Query Results</h2>
        </div>
        <div className="panel-empty">
          Execute a SQL query to see results here.
        </div>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="panel">
        <div className="panel-header">
          <TableIcon size={16} className="text-violet-400" />
          <h2 className="panel-title">Query Results</h2>
        </div>
        <div className="result-error">
          <XCircle size={16} />
          <span>{result.error}</span>
        </div>
      </div>
    );
  }

  if (result.row_count === 0) {
    return (
      <div className="panel">
        <div className="panel-header">
          <TableIcon size={16} className="text-violet-400" />
          <h2 className="panel-title">Query Results</h2>
          <span className="panel-badge">0 rows</span>
        </div>
        <div className="panel-empty">No rows returned.</div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <TableIcon size={16} className="text-violet-400" />
        <h2 className="panel-title">Query Results</h2>
        <span className="panel-badge">{result.row_count} row{result.row_count !== 1 ? "s" : ""}</span>
      </div>

      <div className="results-table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              {result.columns.map((col) => (
                <th key={col} className="results-th">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, ri) => (
              <tr key={ri} className="results-row">
                {row.map((cell, ci) => (
                  <td key={ci} className="results-td">
                    {cell === null ? (
                      <span className="null-cell">NULL</span>
                    ) : (
                      String(cell)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
