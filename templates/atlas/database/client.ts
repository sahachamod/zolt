import { createDatabaseClient, type DatabaseClient } from "@zolt/database";
import { services } from "../config/services.js";

let client: Promise<DatabaseClient> | undefined;

export function getDatabase(): Promise<DatabaseClient> {
  const { driver, url, pool } = services.database;
  if (driver === "none" || !url) throw new Error("No database driver is configured. Set DATABASE_DRIVER and DATABASE_URL.");
  if (!client) client = createDatabaseClient({ driver, url, pool });
  return client;
}
