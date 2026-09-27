import type { DatabaseConfig, MongoClientHandle } from "../types.js";
import { wrapDatabaseError } from "../types.js";
import { withConnectionRetry } from "../retry.js";

export async function createMongoClient(url: string, config: Pick<DatabaseConfig, "pool" | "retry"> = {}): Promise<MongoClientHandle> {
  let mongodb: typeof import("mongodb");
  try {
    mongodb = await import("mongodb");
  } catch {
    throw new Error('The "mongodb" package is required for the mongodb driver. Install it with: npm install mongodb');
  }
  const pool = config.pool ?? {};
  const client = new mongodb.MongoClient(url, {
    maxPoolSize: pool.max,
    maxIdleTimeMS: pool.idleTimeoutMillis,
    connectTimeoutMS: pool.connectionTimeoutMillis
  });
  try {
    await withConnectionRetry(() => client.connect(), config.retry);
  } catch (error) {
    throw wrapDatabaseError(error, "mongodb");
  }
  return {
    driver: "mongodb",
    database(name) {
      return client.db(name);
    },
    async transaction(fn) {
      const session = client.startSession();
      try {
        let value: Awaited<ReturnType<typeof fn>>;
        await session.withTransaction(async () => {
          value = await fn(session);
        });
        return value!;
      } catch (error) {
        throw wrapDatabaseError(error, "mongodb");
      } finally {
        await session.endSession();
      }
    },
    async close() {
      await client.close();
    }
  };
}
