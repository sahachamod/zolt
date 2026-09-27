import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import type { DatabaseConfig, SqlClient, SqlTransaction } from "../types.js";
import { wrapDatabaseError } from "../types.js";
import { withConnectionRetry } from "../retry.js";

export async function createMysqlClient(url: string, config: Pick<DatabaseConfig, "pool" | "retry"> = {}): Promise<SqlClient> {
  let mysql: typeof import("mysql2/promise");
  try {
    mysql = await import("mysql2/promise");
  } catch {
    throw new Error('The "mysql2" package is required for the mysql driver. Install it with: npm install mysql2');
  }
  const pool = config.pool ?? {};
  const retry = config.retry;
  const connectionPool = mysql.createPool({
    uri: url,
    connectionLimit: pool.max,
    connectTimeout: pool.connectionTimeoutMillis
  });
  return {
    driver: "mysql",
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      try {
        const [rows] = await withConnectionRetry(() => connectionPool.query<RowDataPacket[]>(sql, params), retry);
        return { rows: rows as unknown as T[], rowCount: rows.length };
      } catch (error) {
        throw wrapDatabaseError(error, "mysql");
      }
    },
    async execute(sql, params = []) {
      try {
        const [result] = await withConnectionRetry(() => connectionPool.query<ResultSetHeader>(sql, params), retry);
        return { affectedRows: result.affectedRows, insertId: result.insertId };
      } catch (error) {
        throw wrapDatabaseError(error, "mysql");
      }
    },
    async transaction(fn) {
      const connection = await withConnectionRetry(() => connectionPool.getConnection(), retry);
      try {
        await connection.beginTransaction();
        const tx: SqlTransaction = {
          async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
            const [rows] = await connection.query<RowDataPacket[]>(sql, params);
            return { rows: rows as unknown as T[], rowCount: rows.length };
          },
          async execute(sql, params = []) {
            const [result] = await connection.query<ResultSetHeader>(sql, params);
            return { affectedRows: result.affectedRows, insertId: result.insertId };
          }
        };
        const value = await fn(tx);
        await connection.commit();
        return value;
      } catch (error) {
        await connection.rollback().catch(() => {});
        throw wrapDatabaseError(error, "mysql");
      } finally {
        connection.release();
      }
    },
    async close() {
      await connectionPool.end();
    }
  };
}
