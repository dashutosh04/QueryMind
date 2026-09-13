import { useState } from "react";
import { Send, X, Loader2, Sparkles } from "lucide-react";

const EXAMPLE_QUERIES = [
  "Show all students with CGPA above 8",
  "List students in Computer Science department",
  "Find average CGPA by department",
  "Show top 5 students by CGPA",
  "Count enrollments per course",
  "List all courses with more than 3 credits",
  "Show students who enrolled in Machine Learning",
  "Find students with grade A+ in any course",
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
  const [showExamples, setShowExamples] = useState(false);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!loading && question.trim()) onGenerate();
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <Sparkles size={16} className="text-violet-400" />
        <h2 className="panel-title">Natural Language Query</h2>
        <span className="panel-hint">Ctrl+Enter to generate</span>
      </div>

      <textarea
        className="query-textarea"
        placeholder='Ask a question about your database...&#10;e.g. "Show all students with CGPA above 8"'
        value={question}
        onChange={(e) => onQuestionChange(e.target.value)}
        onKeyDown={handleKey}
        rows={4}
        disabled={loading}
      />

      {/* Example queries */}
      <div className="examples-row">
        <button
          className="examples-toggle"
          onClick={() => setShowExamples((p) => !p)}
        >
          {showExamples ? "Hide" : "Show"} examples ↓
        </button>
        {showExamples && (
          <div className="examples-grid">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                className="example-chip"
                onClick={() => {
                  onQuestionChange(q);
                  setShowExamples(false);
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="composer-actions">
        <button
          className="btn-primary"
          onClick={onGenerate}
          disabled={loading || !question.trim()}
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Send size={15} />
              Generate SQL
            </>
          )}
        </button>
        <button
          className="btn-ghost"
          onClick={onClear}
          disabled={loading}
        >
          <X size={15} />
          Clear
        </button>
      </div>
    </div>
  );
}
