import type { DatabaseConfig, SqlClient, SqlTransaction } from "../types.js";
import { wrapDatabaseError } from "../types.js";
import { withConnectionRetry } from "../retry.js";

export async function createPostgresClient(url: string, config: Pick<DatabaseConfig, "pool" | "retry"> = {}): Promise<SqlClient> {
  let pg: typeof import("pg");
  try {
    pg = await import("pg");
  } catch {
    throw new Error('The "pg" package is required for the postgres driver. Install it with: npm install pg');
  }
  const pool = config.pool ?? {};
  const retry = config.retry;
  const connectionPool = new pg.Pool({
    connectionString: url,
    max: pool.max,
    idleTimeoutMillis: pool.idleTimeoutMillis,
    connectionTimeoutMillis: pool.connectionTimeoutMillis
  });
  return {
    driver: "postgres",
    async query(sql, params = []) {
      try {
        const result = await withConnectionRetry(() => connectionPool.query(sql, params), retry);
        return { rows: result.rows, rowCount: result.rowCount ?? result.rows.length };
      } catch (error) {
        throw wrapDatabaseError(error, "postgres");
      }
    },
    async execute(sql, params = []) {
      try {
        const result = await withConnectionRetry(() => connectionPool.query(sql, params), retry);
        return { affectedRows: result.rowCount ?? 0 };
      } catch (error) {
        throw wrapDatabaseError(error, "postgres");
      }
    },
    async transaction(fn) {
      const connection = await withConnectionRetry(() => connectionPool.connect(), retry);
      try {
        await connection.query("BEGIN");
        const tx: SqlTransaction = {
          async query(sql, params = []) {
            const result = await connection.query(sql, params);
            return { rows: result.rows, rowCount: result.rowCount ?? result.rows.length };
          },
          async execute(sql, params = []) {
            const result = await connection.query(sql, params);
            return { affectedRows: result.rowCount ?? 0 };
          }
        };
        const value = await fn(tx);
        await connection.query("COMMIT");
        return value;
      } catch (error) {
        await connection.query("ROLLBACK").catch(() => {});
        throw wrapDatabaseError(error, "postgres");
      } finally {
        connection.release();
      }
    },
    async close() {
      await connectionPool.end();
    }
  };
}
