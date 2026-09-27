import type { ClientSession, Db } from "mongodb";

export type DatabaseDriver = "postgres" | "mysql" | "sqlite" | "mongodb" | "none";

export interface PoolOptions {
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface RetryOptions {
  attempts?: number;
  minDelayMs?: number;
  maxDelayMs?: number;
}

export interface DatabaseConfig {
  driver: DatabaseDriver;
  url: string;
  pool?: PoolOptions;
  retry?: RetryOptions;
}

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

export interface ExecuteResult {
  affectedRows: number;
  insertId?: number | bigint;
}

export interface SqlExecutor {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;
}

export type SqlTransaction = SqlExecutor;

export interface SqlClient extends SqlExecutor {
  driver: "postgres" | "mysql" | "sqlite";
  transaction<T>(fn: (tx: SqlTransaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export interface MongoClientHandle {
  driver: "mongodb";
  database(name?: string): Db;
  transaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export type DatabaseClient = SqlClient | MongoClientHandle;

export class DatabaseError extends Error {
  readonly driver: DatabaseDriver;
  override readonly cause?: unknown;

  constructor(message: string, driver: DatabaseDriver, cause?: unknown) {
    super(message);
    this.name = "DatabaseError";
    this.driver = driver;
    this.cause = cause;
  }
}

export function wrapDatabaseError(error: unknown, driver: DatabaseDriver): DatabaseError {
  if (error instanceof DatabaseError) return error;
  const message = error instanceof Error ? error.message : String(error);
  return new DatabaseError(`${driver} operation failed: ${message}`, driver, error);
}

export function isSqlClient(client: DatabaseClient): client is SqlClient {
  return client.driver !== "mongodb";
}
