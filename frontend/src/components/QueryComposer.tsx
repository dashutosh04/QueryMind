import { Sparkles, Terminal, CornerDownLeft, Loader2, RotateCcw } from "lucide-react";

interface PromptTemplate {
  category: string;
  query: string;
}

const TEMPLATES: PromptTemplate[] = [
  { category: "Filter", query: "Show all students with CGPA above 8" },
  { category: "Group", query: "Find average CGPA by department" },
  { category: "Rank", query: "Show top 5 students by CGPA" },
  { category: "Join", query: "Count enrollments per course" },
  { category: "Courses", query: "List all courses with more than 3 credits" },
  { category: "Relational", query: "Show students who enrolled in Machine Learning" },
];

interface QueryComposerProps {
  question: string;
  onQuestionChange: (q: string) => void;
  onGenerate: () => void;
  onClear: () => void;
  loading: boolean;
}

export default function QueryComposer({
  question,
  onQuestionChange,
  onGenerate,
  onClear,
  loading,
}: QueryComposerProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!loading && question.trim()) onGenerate();
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-header-left">
          <Terminal size={14} style={{ color: "var(--accent)" }} />
          <span className="panel-title">Natural Language Query Prompt</span>
        </div>
        <div className="panel-header-right">
          <span className="panel-badge">Groq LangGraph Workflow</span>
        </div>
      </div>

      <div className="composer-body">
        <div className="prompt-container">
          <textarea
            className="prompt-textarea"
            placeholder="Ask a question about students, courses, enrollments, or professors in plain English..."
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            disabled={loading}
            aria-label="Natural language query prompt"
          />
          <div className="prompt-footer">
            <div className="prompt-shortcut-hint">
              <CornerDownLeft size={12} />
              <span>Press <strong style={{ color: "var(--text-secondary)" }}>Ctrl+Enter</strong> to generate SQL</span>
            </div>
            {question.length > 0 && (
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
                {question.length} chars
              </span>
            )}
          </div>
        </div>

        {/* Templates Bar */}
        <div className="composer-templates-row">
          <span className="template-label">Quick Templates:</span>
          {TEMPLATES.slice(0, 4).map((item) => (
            <button
              key={item.query}
              type="button"
              className="template-pill"
              onClick={() => onQuestionChange(item.query)}
              title={item.query}
            >
              <strong style={{ color: "var(--accent-text)", marginRight: "4px" }}>[{item.category}]</strong>
              {item.query}
            </button>
          ))}
        </div>

        {/* Actions Bar */}
        <div className="composer-actions">
          <button
            className="btn-primary"
            onClick={onGenerate}
            disabled={loading || !question.trim()}
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Synthesizing SQL...</span>
              </>
            ) : (
              <>
                <Sparkles size={13} />
                <span>Generate SQL Query</span>
              </>
            )}
          </button>

          <button
            className="btn-secondary"
            onClick={onClear}
            disabled={loading || (!question && true)}
            title="Reset question prompt"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
}
