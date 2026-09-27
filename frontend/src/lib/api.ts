import type {
  HealthResponse,
  SchemaResponse,
  GenerateResponse,
  ExplainResponse,
  ExecuteResponse,
  QueryHistoryEntry,
  HistoryDeleteResponse,
} from "../types";

// Dev falls back to the local backend. A production build must be given an
// explicit VITE_API_URL; defaulting to localhost there would point the
// browser at the visitor's own machine, so fall back to same-origin requests
// instead (usable behind a rewrite/proxy) and make the misconfiguration loud.
const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;

if (!configuredApiUrl && import.meta.env.PROD) {
  console.error(
    "[api] VITE_API_URL is not set. Set it in your Vercel project environment " +
      "variables to the deployed backend URL, otherwise API calls will fail."
  );
}

const API_URL = configuredApiUrl || (import.meta.env.DEV ? "http://localhost:8000" : "");

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getHealth(): Promise<HealthResponse> {
    return request<HealthResponse>("/api/health");
  },

  getSchema(): Promise<SchemaResponse> {
    return request<SchemaResponse>("/api/schema");
  },

  importSQLFile(formData: FormData): Promise<SchemaResponse> {
    return fetch(`${API_URL}/api/import-sql`, {
      method: "POST",
      body: formData,
    }).then((res) => {
      if (!res.ok) {
        return res.json().then((err) => { throw new Error(err.detail || `HTTP ${res.status}`); });
      }
      return res.json();
    });
  },

  generateSQL(question: string): Promise<GenerateResponse> {
    return request<GenerateResponse>("/api/generate", {
      method: "POST",
      body: JSON.stringify({ question }),
    });
  },

  executeSQL(sql: string): Promise<ExecuteResponse> {
    return request<ExecuteResponse>("/api/execute", {
      method: "POST",
      body: JSON.stringify({ sql }),
    });
  },

  explainSQL(sql: string, question?: string): Promise<ExplainResponse> {
    return request<ExplainResponse>("/api/explain", {
      method: "POST",
      body: JSON.stringify({ sql, question: question || "" }),
    });
  },

  // History API
  getHistory(): Promise<QueryHistoryEntry[]> {
    return request<QueryHistoryEntry[]>("/api/history");
  },

  saveHistory(entry: QueryHistoryEntry): Promise<QueryHistoryEntry> {
    return request<QueryHistoryEntry>("/api/history", {
      method: "POST",
      body: JSON.stringify(entry),
    });
  },

  deleteHistoryItem(id: string): Promise<HistoryDeleteResponse> {
    return request<HistoryDeleteResponse>(`/api/history/${id}`, {
      method: "DELETE",
    });
  },

  clearHistory(): Promise<HistoryDeleteResponse> {
    return request<HistoryDeleteResponse>("/api/history", {
      method: "DELETE",
    });
  },
};
