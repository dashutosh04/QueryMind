import { useState, useEffect, useCallback } from "react";
import {
  Terminal,
  Sparkles,
  Code2,
  Table2,
  BookOpen,
  ShieldCheck,
  Cpu,
  AlertTriangle,
} from "lucide-react";
import { api } from "../lib/api";
import type {
  SchemaResponse,
  GenerateResponse,
  ExplainResponse,
  ExecuteResponse,
  QueryHistoryEntry,
  HealthResponse,
} from "../types";

import Sidebar from "../components/Sidebar";
import QueryComposer from "../components/QueryComposer";
import SchemaPanel from "../components/SchemaPanel";
import SqlPanel from "../components/SqlPanel";
import ExplanationPanel from "../components/ExplanationPanel";
import ResultsTable from "../components/ResultsTable";
import HistoryPanel from "../components/HistoryPanel";
import SqlEditor from "../components/SqlEditor";

export default function Dashboard() {
  // Backend health status
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);

  // Schema state
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  // Input modes & queries
  const [question, setQuestion] = useState("");
  const [manualSql, setManualSql] = useState("SELECT * FROM students LIMIT 20;");
  const [queryMode, setQueryMode] = useState<"ai" | "sql">("ai");

  // Output console active tab
  const [consoleTab, setConsoleTab] = useState<"results" | "explanation">("results");

  // AI Generation state
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<GenerateResponse | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Explanation state
  const [explainResult, setExplainResult] = useState<ExplainResponse | null>(null);

  // Execution state
  const [executing, setExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<ExecuteResponse | null>(null);

  // Server-side query history
  const [history, setHistory] = useState<QueryHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Active navigation section
  const [activeSection, setActiveSection] = useState("query");

  // Health fetch on mount
  useEffect(() => {
    api
      .getHealth()
      .then((h) => {
        setHealth(h);
        setBackendOnline(h.status === "ok");
      })
      .catch(() => setBackendOnline(false));
  }, []);

  // Schema fetch on mount
  useEffect(() => {
    api
      .getSchema()
      .then((s) => {
        setSchema(s);
        setSchemaError(null);
      })
      .catch((e: Error) => setSchemaError(e.message))
      .finally(() => setSchemaLoading(false));
  }, []);

  // Fetch server-side history on mount
  useEffect(() => {
    setHistoryLoading(true);
    api
      .getHistory()
      .then((items) => setHistory(items))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, []);

  // Execute SQL handler
  const handleExecute = useCallback(async (sql: string) => {
    setExecuting(true);
    setExecuteResult(null);
    setConsoleTab("results");
    try {
      const result = await api.executeSQL(sql);
      setExecuteResult(result);
      return result;
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      const errResult = { columns: [], rows: [], row_count: 0, error: err.message };
      setExecuteResult(errResult);
      return errResult;
    } finally {
      setExecuting(false);
    }
  }, []);

  // Generate SQL handler
  const handleGenerate = useCallback(async () => {
    if (!question.trim()) return;
    setGenerating(true);
    setGenerateResult(null);
    setGenerateError(null);
    setExplainResult(null);
    setExecuteResult(null);

    const startTime = Date.now();
    try {
      const result = await api.generateSQL(question);
      setGenerateResult(result);

      // Auto-fetch explanation if not ambiguous and SQL is present
      if (!result.is_ambiguous && result.sql && result.validation.valid) {
        const explain = await api.explainSQL(result.sql, question);
        setExplainResult(explain);
      }

      // Build and persist history entry to server
      let execRowCount: number | null = null;
      let execDurationMs: number | null = null;

      if (result.validation.valid && result.sql) {
        const execResult = await handleExecute(result.sql);
        execRowCount = execResult?.row_count ?? null;
        execDurationMs = Date.now() - startTime;
      }

      const entry: QueryHistoryEntry = {
        id: crypto.randomUUID(),
        question,
        sql: result.sql,
        timestamp: new Date().toISOString(),
        valid: result.validation.valid,
        row_count: execRowCount,
        execution_duration_ms: execDurationMs,
        error: result.validation.error ?? null,
      };

      // Optimistically update local state
      setHistory((prev) => [entry, ...prev]);

      // Persist to server (fire and forget - non-critical)
      api.saveHistory(entry).catch((e) =>
        console.warn("[history] Failed to persist entry:", e)
      );
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      setGenerateError(err.message);
    } finally {
      setGenerating(false);
    }
  }, [question, handleExecute]);

  // Delete single history item
  const handleDeleteHistory = useCallback(async (id: string) => {
    setHistory((prev) => prev.filter((e) => e.id !== id));
    api.deleteHistoryItem(id).catch((e) =>
      console.warn("[history] Failed to delete item:", e)
    );
  }, []);

  // Clear all history
  const handleClearHistory = useCallback(async () => {
    setHistory([]);
    api.clearHistory().catch((e) =>
      console.warn("[history] Failed to clear history:", e)
    );
  }, []);

  // Clear query workspace
  const handleClear = useCallback(() => {
    setQuestion("");
    setManualSql("");
    setGenerateResult(null);
    setGenerateError(null);
    setExplainResult(null);
    setExecuteResult(null);
  }, []);

  // New query reset
  const handleNewQuery = useCallback(() => {
    handleClear();
    setActiveSection("query");
    setQueryMode("ai");
  }, [handleClear]);

  // Select item from history
  const handleSelectHistory = useCallback((entry: QueryHistoryEntry) => {
    setQuestion(entry.question);
    setManualSql(entry.sql);
    setGenerateResult({
      sql: entry.sql,
      validation: { valid: entry.valid, error: entry.error ?? null },
      revised: false,
      revision_attempts: 0,
      is_ambiguous: false,
      clarification: null,
      reasoning: null,
      tables_referenced: [],
      duration_ms: 0,
    });
    setExplainResult(null);
    setExecuteResult(null);
    setActiveSection("query");
    setQueryMode("ai");
  }, []);

  // Quick query table helper from schema
  const handleQueryTable = useCallback((tableName: string) => {
    const sql = `SELECT * FROM ${tableName} LIMIT 20;`;
    setManualSql(sql);
    setActiveSection("query");
    setQueryMode("sql");
    handleExecute(sql);
  }, [handleExecute]);

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        history={history}
        backendOnline={backendOnline}
        onNewQuery={handleNewQuery}
        onSelectHistory={handleSelectHistory}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Utility Header */}
        <header className="app-header">
          <div className="header-left">
            <div className="brand-badge">
              <div className="brand-glyph">
                <Terminal size={14} />
              </div>
              <span className="brand-title">QueryMind</span>
            </div>

            <div className="header-divider" />

            <div className="header-breadcrumbs">
              <span>workspace</span>
              <span>/</span>
              <span>sqlite</span>
              <span>/</span>
              <span className="breadcrumb-active">querymind.db</span>
            </div>
          </div>

          <div className="header-right">
            <div className="header-status-pill">
              <div className={`status-indicator-dot ${backendOnline ? "online" : "offline"}`} />
              <span>{backendOnline ? "Connected" : "Disconnected"}</span>
            </div>

            {health && (
              <div className="header-meta-chip">
                <span>Model:</span>
                <strong>{health.model}</strong>
              </div>
            )}
          </div>
        </header>

        {/* Global Error Banner */}
        {generateError && (
          <div className="validation-error-callout" style={{ padding: "8px 16px" }}>
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            <span>Generation failed: {generateError}</span>
          </div>
        )}

        {/* Ambiguity Banner */}
        {generateResult?.is_ambiguous && generateResult.clarification && (
          <div
            className="validation-error-callout"
            style={{ padding: "8px 16px", borderColor: "var(--amber-border, #b45309)", color: "var(--amber-text, #fbbf24)" }}
          >
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            <span>
              <strong>Clarification needed:</strong> {generateResult.clarification}
            </span>
          </div>
        )}

        {/* Query Console View */}
        {activeSection === "query" && (
          <>
            {/* Mode Switcher Bar */}
            <div className="mode-bar">
              <div className="segmented-control" role="tablist" aria-label="Query Mode">
                <button
                  type="button"
                  className={`segmented-btn ${queryMode === "ai" ? "active" : ""}`}
                  onClick={() => setQueryMode("ai")}
                  role="tab"
                  aria-selected={queryMode === "ai"}
                >
                  <Sparkles size={13} className="btn-icon" />
                  <span>AI Assistant</span>
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${queryMode === "sql" ? "active" : ""}`}
                  onClick={() => setQueryMode("sql")}
                  role="tab"
                  aria-selected={queryMode === "sql"}
                >
                  <Code2 size={13} className="btn-icon" />
                  <span>Direct SQL</span>
                </button>
              </div>

              <div className="mode-bar-hint">
                <span className="kbd-shortcut">F5 / Ctrl+Enter</span>
                <span>to execute query</span>
              </div>
            </div>

            {/* Split Workspace */}
            <div className="workspace">
              {/* Left Column: Query Input & Results */}
              <div className="workspace-main">
                {queryMode === "ai" ? (
                  <>
                    <QueryComposer
                      question={question}
                      onQuestionChange={setQuestion}
                      onGenerate={handleGenerate}
                      onClear={handleClear}
                      loading={generating}
                    />
                    <SqlPanel
                      result={generateResult}
                      onExecute={handleExecute}
                      onRegenerate={handleGenerate}
                      onOpenInEditor={(sql) => {
                        setManualSql(sql);
                        setQueryMode("sql");
                      }}
                      executing={executing}
                      loading={generating}
                    />
                  </>
                ) : (
                  <SqlEditor
                    sql={manualSql}
                    onSqlChange={setManualSql}
                    onExecute={handleExecute}
                    onClear={() => {
                      setManualSql("");
                      setExecuteResult(null);
                    }}
                    executing={executing}
                  />
                )}

                {/* Tabbed Console Output Panel */}
                <div className="console-panel">
                  <div className="console-tabs-bar">
                    <div className="console-tabs">
                      <button
                        type="button"
                        className={`console-tab-btn ${consoleTab === "results" ? "active" : ""}`}
                        onClick={() => setConsoleTab("results")}
                      >
                        <Table2 size={13} />
                        <span>Query Results</span>
                        {executeResult && (
                          <span className="panel-badge">{executeResult.row_count} rows</span>
                        )}
                      </button>

                      {queryMode === "ai" && (
                        <button
                          type="button"
                          className={`console-tab-btn ${consoleTab === "explanation" ? "active" : ""}`}
                          onClick={() => setConsoleTab("explanation")}
                        >
                          <BookOpen size={13} />
                          <span>Execution Plan &amp; Analysis</span>
                          {explainResult && (
                            <span className="panel-badge" style={{ color: "var(--accent-text)" }}>Ready</span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="console-content">
                    {consoleTab === "results" ? (
                      <ResultsTable result={executeResult} loading={executing} />
                    ) : (
                      <ExplanationPanel explanation={explainResult} loading={generating} />
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Schema Explorer */}
              <div className="workspace-rail">
                <SchemaPanel
                  schema={schema}
                  loading={schemaLoading}
                  error={schemaError}
                  onQueryTable={handleQueryTable}
                />
              </div>
            </div>
          </>
        )}

        {/* Schema Explorer View */}
        {activeSection === "schema" && (
          <div className="full-page-view">
            <SchemaPanel
              schema={schema}
              loading={schemaLoading}
              error={schemaError}
              onQueryTable={handleQueryTable}
            />
          </div>
        )}

        {/* Query History View */}
        {activeSection === "history" && (
          <HistoryPanel
            history={history}
            loading={historyLoading}
            onSelect={handleSelectHistory}
            onDelete={handleDeleteHistory}
            onClearAll={handleClearHistory}
          />
        )}

        {/* Architecture & Safety View */}
        {activeSection === "about" && (
          <div className="full-page-view">
            <div className="panel" style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--border-base)", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <ShieldCheck size={18} style={{ color: "var(--accent)" }} />
                <h2 style={{ fontSize: "16px", fontWeight: 600 }}>System Architecture &amp; Security Specification</h2>
              </div>

              <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "20px" }}>
                QueryMind provides natural language to SQL translation using Groq high-speed inference,
                LangChain for prompt synthesis, and LangGraph for self-correcting validation loops against live SQLite databases.
              </p>

              {/* Workflow Flowchart */}
              <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)", marginBottom: "8px" }}>
                LangGraph Autonomous Workflow Loop
              </h3>
              <div className="workflow-spec-grid">
                {["1. Load Schema", "2. Generate SQL", "3. Safety Check", "4. Syntax Validate", "5. Revise Loop (max 3x)", "6. Explain Query"].map(
                  (step, idx, arr) => (
                    <div key={step} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div className="workflow-node-box">{step}</div>
                      {idx < arr.length - 1 && <span className="workflow-arrow-divider">&#8594;</span>}
                    </div>
                  )
                )}
              </div>

              {/* Security & Sandbox */}
              <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                <div className="metadata-card" style={{ padding: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <ShieldCheck size={14} style={{ color: "var(--accent)" }} />
                    <strong style={{ fontSize: "12px" }}>Execution Sandbox Rules</strong>
                  </div>
                  <ul style={{ paddingLeft: "18px", color: "var(--text-secondary)", fontSize: "12px", lineHeight: 1.6 }}>
                    <li>Strict read-only enforcement: Only <code>SELECT</code> queries are executed.</li>
                    <li>Mutation statements (<code>INSERT</code>, <code>UPDATE</code>, <code>DELETE</code>) are blocked.</li>
                    <li>DDL statements (<code>DROP</code>, <code>ALTER</code>, <code>CREATE</code>) are prohibited.</li>
                    <li>Administrative PRAGMA and ATTACH commands are rejected.</li>
                    <li>Multiple semicolon-separated statements are blocked.</li>
                  </ul>
                </div>

                <div className="metadata-card" style={{ padding: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <Cpu size={14} style={{ color: "var(--cyan-text)" }} />
                    <strong style={{ fontSize: "12px" }}>Underlying Tech Stack</strong>
                  </div>
                  <ul style={{ paddingLeft: "18px", color: "var(--text-secondary)", fontSize: "12px", lineHeight: 1.6 }}>
                    <li><strong>Backend:</strong> Python 3.11+, FastAPI, Uvicorn ASGI server</li>
                    <li><strong>AI:</strong> LangChain + LangGraph, Groq API (llama-3.3-70b-versatile)</li>
                    <li><strong>Database:</strong> SQLite with academic schema and relational indexing</li>
                    <li><strong>Frontend:</strong> React 19, TypeScript, Vite, CSS Design System</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
