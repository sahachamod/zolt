import type { DatabaseConfig, SqlClient, SqlTransaction } from "../types.js";
import { wrapDatabaseError } from "../types.js";

export async function createSqliteClient(url: string, _config: Pick<DatabaseConfig, "pool" | "retry"> = {}): Promise<SqlClient> {
  let sqlite: typeof import("node:sqlite");
  try {
    sqlite = await import("node:sqlite");
  } catch {
    throw new Error("node:sqlite is unavailable in this Node.js runtime. Use Node.js 22.5+ or select a different driver.");
  }
  const filename = url.startsWith("sqlite:") ? url.slice("sqlite:".length) : url;
  const db = new sqlite.DatabaseSync(filename || ":memory:");

  function runQuery<T>(sql: string, params: unknown[]): { rows: T[]; rowCount: number } {
    const rows = db.prepare(sql).all(...(params as never[])) as T[];
    return { rows, rowCount: rows.length };
  }

  function runExecute(sql: string, params: unknown[]) {
    const result = db.prepare(sql).run(...(params as never[]));
    return { affectedRows: Number(result.changes), insertId: result.lastInsertRowid };
  }

  return {
    driver: "sqlite",
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      try {
        return runQuery<T>(sql, params);
      } catch (error) {
        throw wrapDatabaseError(error, "sqlite");
      }
    },
    async execute(sql, params = []) {
      try {
        return runExecute(sql, params);
      } catch (error) {
        throw wrapDatabaseError(error, "sqlite");
      }
    },
    async transaction(fn) {
      db.exec("BEGIN");
      try {
        const tx: SqlTransaction = {
          async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
            return runQuery<T>(sql, params);
          },
          async execute(sql, params = []) {
            return runExecute(sql, params);
          }
        };
        const value = await fn(tx);
        db.exec("COMMIT");
        return value;
      } catch (error) {
        try {
          db.exec("ROLLBACK");
        } catch {
          /* connection already closed or rolled back */
        }
        throw wrapDatabaseError(error, "sqlite");
      }
    },
    async close() {
      db.close();
    }
  };
}
