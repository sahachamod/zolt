import type { DatabaseClient } from "./types.js";
import { isSqlClient, wrapDatabaseError } from "./types.js";

export interface Migration {
  id: string;
  up: (client: DatabaseClient) => Promise<void>;
}

const migrationsTableSql = "CREATE TABLE IF NOT EXISTS _zolt_migrations (id VARCHAR(255) PRIMARY KEY, applied_at VARCHAR(64) NOT NULL)";

function insertMigrationSql(driver: "postgres" | "mysql" | "sqlite"): string {
  return driver === "postgres"
    ? "INSERT INTO _zolt_migrations (id, applied_at) VALUES ($1, $2)"
    : "INSERT INTO _zolt_migrations (id, applied_at) VALUES (?, ?)";
}

/**
 * Applies migrations that have not run yet, in array order, and records each as applied.
 * Returns the ids of migrations that were newly applied.
 */
export async function runMigrations(client: DatabaseClient, migrations: Migration[]): Promise<string[]> {
  const applied: string[] = [];
  if (isSqlClient(client)) {
    try {
      await client.execute(migrationsTableSql);
      const { rows } = await client.query<{ id: string }>("SELECT id FROM _zolt_migrations");
      const done = new Set(rows.map((row) => row.id));
      for (const migration of migrations) {
        if (done.has(migration.id)) continue;
        await migration.up(client);
        await client.execute(insertMigrationSql(client.driver), [migration.id, new Date().toISOString()]);
        applied.push(migration.id);
      }
    } catch (error) {
      throw wrapDatabaseError(error, client.driver);
    }
    return applied;
  }

  try {
    const collection = client.database().collection<{ _id: string; appliedAt: string }>("_zolt_migrations");
    const done = new Set((await collection.find({}).toArray()).map((doc) => doc._id));
    for (const migration of migrations) {
      if (done.has(migration.id)) continue;
      await migration.up(client);
      await collection.insertOne({ _id: migration.id, appliedAt: new Date().toISOString() });
      applied.push(migration.id);
    }
  } catch (error) {
    throw wrapDatabaseError(error, "mongodb");
  }
  return applied;
}
