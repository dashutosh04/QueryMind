// TypeScript types for QueryMind

export interface ColumnInfo {
  name: string;
  type: string;
  primary_key: boolean;
  nullable: boolean;
}

export interface TableSchema {
  name: string;
  columns: ColumnInfo[];
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

export interface QueryHistoryEntry {
  id: string;
  question: string;
  sql: string;
  timestamp: Date;
  valid: boolean;
}
