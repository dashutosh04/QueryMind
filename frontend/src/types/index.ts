// TypeScript types for QueryMind

export interface ColumnInfo {
  name: string;
  type: string;
  primary_key: boolean;
  nullable: boolean;
}

export interface ForeignKeyInfo {
  column: string;
  referred_table: string;
  referred_column: string;
}

export interface TableSchema {
  name: string;
  columns: ColumnInfo[];
  foreign_keys: ForeignKeyInfo[];
}

export interface SchemaResponse {
  tables: TableSchema[];
}

export interface HealthResponse {
  status: string;
  version: string;
  model: string;
}

export interface ValidationResult {
  valid: boolean;
  error: string | null;
}

export interface GenerateResponse {
  sql: string;
  validation: ValidationResult;
  revised: boolean;
  revision_attempts: number;
  is_ambiguous: boolean;
  clarification: string | null;
  reasoning: string | null;
  tables_referenced: string[];
  duration_ms: number;
}

export interface ExplainResponse {
  explanation: string;
  tables_used: string[];
  operations: string[];
  filters: string[];
  sorting_grouping: string[];
}

export interface ExecuteResponse {
  columns: string[];
  rows: unknown[][];
  row_count: number;
  error: string | null;
}

// Matches the query_history table schema and backend HistoryItemResponse
export interface QueryHistoryEntry {
  id: string;
  question: string;
  sql: string;
  timestamp: string; // ISO string from the server
  valid: boolean;
  row_count?: number | null;
  execution_duration_ms?: number | null;
  error?: string | null;
}

export interface HistoryDeleteResponse {
  success: boolean;
  deleted_id?: string | null;
  deleted_count?: number | null;
}
