import type { DatabaseClient, DatabaseConfig } from "./types.js";

export {
  DatabaseError,
  wrapDatabaseError,
  isSqlClient
} from "./types.js";
export type {
  DatabaseDriver,
  DatabaseConfig,
  PoolOptions,
  RetryOptions,
  ExecuteResult,
  QueryResult,
  SqlExecutor,
  SqlTransaction,
  SqlClient,
  MongoClientHandle,
  DatabaseClient
} from "./types.js";
export { runMigrations } from "./migrations.js";
export type { Migration } from "./migrations.js";

export async function createDatabaseClient(config: DatabaseConfig): Promise<DatabaseClient> {
  switch (config.driver) {
    case "postgres":
      return (await import("./drivers/postgres.js")).createPostgresClient(config.url, config);
    case "mysql":
      return (await import("./drivers/mysql.js")).createMysqlClient(config.url, config);
    case "sqlite":
      return (await import("./drivers/sqlite.js")).createSqliteClient(config.url, config);
    case "mongodb":
      return (await import("./drivers/mongodb.js")).createMongoClient(config.url, config);
    case "none":
      throw new Error('Cannot create a database client when database.driver is "none".');
    default:
      throw new Error(`Unsupported database driver: ${config.driver as string}`);
  }
}
