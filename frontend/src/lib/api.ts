import type {
  HealthResponse,
  SchemaResponse,
  GenerateResponse,
  ExplainResponse,
  ExecuteResponse,
} from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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
};
