import { useState, useEffect, useCallback } from "react";
import { Brain, Zap, Database, Code2, Sparkles } from "lucide-react";
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
  // Backend status
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);

  // Schema
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  // Question
  const [question, setQuestion] = useState("");
  const [manualSql, setManualSql] = useState("SELECT * FROM students LIMIT 20;");
  const [queryMode, setQueryMode] = useState<"ai" | "sql">("ai");

  // Generation
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<GenerateResponse | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Explanation
  const [explainResult, setExplainResult] = useState<ExplainResponse | null>(null);

  // Execution
  const [executing, setExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<ExecuteResponse | null>(null);

  // History
  const [history, setHistory] = useState<QueryHistoryEntry[]>(() => {
    try {
      const raw = sessionStorage.getItem("qm_history");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // UI
  const [activeSection, setActiveSection] = useState("query");

  // ── Fetch health on mount ──────────────────────────────────────────────
  useEffect(() => {
    api
      .getHealth()
      .then((h) => {
        setHealth(h);
        setBackendOnline(h.status === "ok");
      })
      .catch(() => setBackendOnline(false));
  }, []);

  // ── Fetch schema on mount ──────────────────────────────────────────────
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

  // ── Persist history to sessionStorage ─────────────────────────────────
  useEffect(() => {
    sessionStorage.setItem("qm_history", JSON.stringify(history));
  }, [history]);

  // ── Generate SQL ───────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!question.trim()) return;
    setGenerating(true);
    setGenerateResult(null);
    setGenerateError(null);
    setExplainResult(null);
    setExecuteResult(null);

    try {
      const result = await api.generateSQL(question);
      setGenerateResult(result);

      // Auto-fetch explanation
      const explain = await api.explainSQL(result.sql, question);
      setExplainResult(explain);

      // Add to history
      const entry: QueryHistoryEntry = {
        id: crypto.randomUUID(),
        question,
        sql: result.sql,
        timestamp: new Date(),
        valid: result.validation.valid,
      };
      setHistory((prev) => [...prev, entry]);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      setGenerateError(err.message);
    } finally {
      setGenerating(false);
    }
  }, [question]);

  // ── Execute SQL ────────────────────────────────────────────────────────
  const handleExecute = useCallback(async (sql: string) => {
    setExecuting(true);
    setExecuteResult(null);
    try {
      const result = await api.executeSQL(sql);
      setExecuteResult(result);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      setExecuteResult({ columns: [], rows: [], row_count: 0, error: err.message });
    } finally {
      setExecuting(false);
    }
  }, []);

  // ── Clear ──────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setQuestion("");
    setManualSql("");
    setGenerateResult(null);
    setGenerateError(null);
    setExplainResult(null);
    setExecuteResult(null);
  }, []);

  // ── New query (alias for clear) ────────────────────────────────────────
  const handleNewQuery = useCallback(() => {
    handleClear();
    setActiveSection("query");
  }, [handleClear]);

  // ── Load from history ──────────────────────────────────────────────────
  const handleSelectHistory = useCallback((entry: QueryHistoryEntry) => {
    setQuestion(entry.question);
    setManualSql(entry.sql);
    setGenerateResult({
      sql: entry.sql,
      validation: { valid: entry.valid, error: null },
      revised: false,
      revision_attempts: 0,
    });
    setExplainResult(null);
    setExecuteResult(null);
    setActiveSection("query");
    setQueryMode("ai");
  }, []);

  return (
    <div className="app-layout">
      <Sidebar
        history={history}
        backendOnline={backendOnline}
        onNewQuery={handleNewQuery}
        onSelectHistory={handleSelectHistory}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <main className="main-content">
        {/* Header */}
        <header className="app-header">
          <div className="header-left">
            <div className="header-logo">
              <Brain size={22} className="text-violet-400" />
            </div>
            <div>
              <h1 className="header-title">QueryMind</h1>
              <p className="header-sub">
                AI-Powered Natural Language → SQL Generator
              </p>
            </div>
          </div>
          <div className="header-badges">
            <div className="header-badge">
              <Zap size={12} className="text-amber-400" />
              <span>Groq</span>
            </div>
            <div className="header-badge">
              <Database size={12} className="text-cyan-400" />
              <span>SQLite</span>
            </div>
            {health && (
              <div className="header-badge">
                <span className="text-xs text-zinc-400">{health.model}</span>
              </div>
            )}
          </div>
        </header>

        {activeSection === "query" && (
          <div className="mode-switcher" role="tablist" aria-label="Query mode">
            <button
              className={`mode-tab ${queryMode === "ai" ? "mode-tab-active" : ""}`}
              onClick={() => setQueryMode("ai")}
              role="tab"
              aria-selected={queryMode === "ai"}
            >
              <Sparkles size={15} />
              Ask with AI
              <span>Natural language</span>
            </button>
            <button
              className={`mode-tab ${queryMode === "sql" ? "mode-tab-active" : ""}`}
              onClick={() => setQueryMode("sql")}
              role="tab"
              aria-selected={queryMode === "sql"}
            >
              <Code2 size={15} />
              Write SQL
              <span>Manual editor</span>
            </button>
          </div>
        )}

        {/* Error banner */}
        {generateError && (
          <div className="error-banner">
            ⚠ {generateError}
          </div>
        )}

        {/* Main sections */}
        {activeSection === "query" && (
          <div className="workspace">
            {/* Left column */}
            <div className="workspace-left">
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
                    executing={executing}
                    loading={generating}
                  />
                  <ResultsTable result={executeResult} loading={executing} />
                  <ExplanationPanel
                    explanation={explainResult}
                    loading={generating}
                  />
                </>
              ) : (
                <>
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
                  <ResultsTable result={executeResult} loading={executing} />
                </>
              )}
            </div>

            {/* Right column */}
            <div className="workspace-right">
              <SchemaPanel
                schema={schema}
                loading={schemaLoading}
                error={schemaError}
              />
              <div className="rail-note">
                <Code2 size={15} className="text-cyan-400" />
                <div>
                  <strong>Need a quick answer?</strong>
                  <p>Use the SQL workspace to run a focused read-only query.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === "schema" && (
          <div className="section-full">
            <SchemaPanel
              schema={schema}
              loading={schemaLoading}
              error={schemaError}
            />
          </div>
        )}

        {activeSection === "about" && (
          <div className="section-full">
            <div className="panel about-panel">
              <div className="panel-header">
                <Brain size={16} className="text-violet-400" />
                <h2 className="panel-title">About QueryMind</h2>
              </div>
              <div className="about-content">
                <h3>AI-Powered Natural Language SQL Generator</h3>
                <p>
                  QueryMind converts plain English questions into valid SQL queries using
                  Groq's blazing-fast LLM inference, LangChain for prompt management,
                  and LangGraph for an intelligent retry workflow.
                </p>

                <h4>LangGraph Workflow</h4>
                <div className="workflow-diagram">
                  {["Load Schema", "Generate SQL", "Validate SQL", "Revise SQL (if invalid)", "Explain SQL"].map(
                    (step, i, arr) => (
                      <div key={step} className="workflow-step">
                        <div className="workflow-node">{step}</div>
                        {i < arr.length - 1 && <div className="workflow-arrow">↓</div>}
                      </div>
                    )
                  )}
                </div>

                <h4>Tech Stack</h4>
                <ul>
                  <li><strong>Frontend:</strong> React 18, Vite, TypeScript, Tailwind CSS</li>
                  <li><strong>Backend:</strong> Python, FastAPI, Uvicorn</li>
                  <li><strong>AI:</strong> Groq API, LangChain, LangGraph</li>
                  <li><strong>Database:</strong> SQLite with realistic college data</li>
                </ul>

                <h4>Safety</h4>
                <p>
                  Only <code>SELECT</code> queries are executed. All INSERT, UPDATE,
                  DELETE, DROP, ALTER, CREATE, PRAGMA, and ATTACH statements are blocked.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* History section always shows in sidebar but also as a full page */}
        {activeSection === "history" && (
          <div className="section-full">
            <HistoryPanel history={history} onSelect={handleSelectHistory} />
          </div>
        )}
      </main>
    </div>
  );
}
