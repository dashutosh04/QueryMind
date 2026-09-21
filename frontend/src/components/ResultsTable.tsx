import { useState } from "react";
import {
  Table2,
  Download,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import type { ExecuteResponse } from "../types";

interface ResultsTableProps {
  result: ExecuteResponse | null;
  loading: boolean;
}

export default function ResultsTable({ result, loading }: ResultsTableProps) {
  const [copied, setCopied] = useState(false);

  // Export to CSV helper
  const handleExportCSV = () => {
    if (!result || !result.rows.length) return;
    const header = result.columns.join(",");
    const rows = result.rows.map((row) =>
      row
        .map((cell) => {
          if (cell === null) return "";
          const str = String(cell);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `querymind_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy JSON helper
  const handleCopyJSON = async () => {
    if (!result || !result.rows.length) return;
    const jsonData = result.rows.map((row) => {
      const obj: Record<string, unknown> = {};
      result.columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
    await navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="table-container" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="state-loading">
          <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent)" }} />
          <span>Executing query against SQLite database...</span>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="table-container" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="state-empty">
          <Table2 size={24} style={{ opacity: 0.3 }} />
          <p style={{ fontSize: "12.5px" }}>Execute a query to inspect tabular results.</p>
        </div>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="table-container" style={{ padding: "16px" }}>
        <div className="validation-error-callout" style={{ borderRadius: "var(--radius-sm)" }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: "1px" }} />
          <div>
            <strong>Execution Error:</strong>
            <p style={{ marginTop: "4px" }}>{result.error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (result.row_count === 0) {
    return (
      <div className="table-container" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="state-empty">
          <FileSpreadsheet size={24} style={{ opacity: 0.3 }} />
          <p style={{ fontSize: "12.5px" }}>Query executed successfully. 0 rows returned.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Table Toolbar */}
      <div className="sql-editor-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", fontFamily: "JetBrains Mono, monospace", color: "var(--text-secondary)" }}>
            {result.row_count} {result.row_count === 1 ? "record" : "records"} returned
          </span>
          <span className="panel-badge">{result.columns.length} columns</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            className="btn-ghost"
            style={{ padding: "3px 8px", fontSize: "11px" }}
            onClick={handleCopyJSON}
            title="Copy as JSON"
          >
            {copied ? <Check size={11} style={{ color: "var(--accent)" }} /> : <Copy size={11} />}
            <span>{copied ? "Copied" : "JSON"}</span>
          </button>

          <button
            className="btn-ghost"
            style={{ padding: "3px 8px", fontSize: "11px" }}
            onClick={handleExportCSV}
            title="Download CSV"
          >
            <Download size={11} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* High-Density Data Grid */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className="row-index-cell">#</th>
              {result.columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, ri) => (
              <tr key={ri}>
                <td className="row-index-cell">{ri + 1}</td>
                {row.map((cell, ci) => (
                  <td key={ci}>
                    {cell === null ? (
                      <span className="null-badge">NULL</span>
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

      {/* Footer Status Bar */}
      <div className="table-status-bar">
        <span>Displaying {result.rows.length} rows</span>
        <span>SQLite 3 (In-Memory / Local DB)</span>
      </div>
    </div>
  );
}
