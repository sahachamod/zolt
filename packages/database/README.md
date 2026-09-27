# @zolt-framework/database

A unified database client for Zolt applications. One factory, four drivers.

```ts
import { createDatabaseClient, isSqlClient } from "@zolt-framework/database";

const db = await createDatabaseClient({
  driver: "postgres",
  url: process.env.DATABASE_URL!,
  pool: { max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 }
});

if (isSqlClient(db)) {
  const { rows } = await db.query("SELECT id, email FROM users WHERE tenant_id = $1", [tenantId]);
}

await db.close();
```

## Transactions

```ts
await db.transaction(async (tx) => {
  await tx.execute("UPDATE accounts SET balance = balance - ? WHERE id = ?", [amount, from]);
  await tx.execute("UPDATE accounts SET balance = balance + ? WHERE id = ?", [amount, to]);
});
```

The transaction commits if the callback resolves and rolls back automatically if it throws. `mongodb`'s `transaction()` hands the callback a `ClientSession` instead of a `tx` executor — use it with the collection API (`collection.updateOne(filter, update, { session })`); Mongo transactions require a replica set or sharded cluster.

## Migrations

```ts
import { runMigrations } from "@zolt-framework/database";

await runMigrations(db, [
  { id: "001_create_users", up: async (client) => { await client.execute("CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT NOT NULL)"); } }
]);
```

`runMigrations` tracks applied ids in a `_zolt_migrations` table (SQL drivers) or collection (`mongodb`) and only runs migrations that haven't been applied yet, in array order.

## Errors

Every driver call throws a `DatabaseError` (`{ message, driver, cause }`) instead of a raw driver-specific error, so callers can handle failures without knowing which client is underneath.

## Retry

```ts
const db = await createDatabaseClient({
  driver: "postgres",
  url: process.env.DATABASE_URL!,
  retry: { attempts: 3, minDelayMs: 100, maxDelayMs: 2000 }
});
```

`query()`, `execute()`, and the initial connection acquisition for `transaction()` retry with exponential backoff, but only for errors that mean a connection was never established (`ECONNREFUSED`, `ETIMEDOUT`, DNS failures, etc.). Errors that could mean a write already reached the server (e.g. `ECONNRESET` mid-query) are never retried, so retrying cannot double-apply a write.

## Integration tests

`test/integration/drivers.test.mjs` runs the full suite (queries, transactions, migrations) against real postgres, mysql, and mongodb containers via Docker — not mocks. Run it locally with Docker running:

```bash
npm run test:integration
```

It starts throwaway containers on non-default ports, waits for readiness, runs the tests, and tears them down even on failure.

## Drivers

| Driver     | Backing package | Interface     |
| ---------- | ---------------- | ------------- |
| `postgres` | `pg`              | `SqlClient`   |
| `mysql`    | `mysql2`          | `SqlClient`   |
| `sqlite`   | `node:sqlite`     | `SqlClient`   |
| `mongodb`  | `mongodb`         | `MongoClientHandle` |

`postgres`, `mysql`, and `mongodb` are peer dependencies: install only the one your project uses. `sqlite` uses Node's built-in `node:sqlite` module and needs no install.

`SqlClient` exposes `query()` for reads, `execute()` for writes, and `close()`. `MongoClientHandle` exposes `database()` (returns a `mongodb` `Db`) and `close()`.

Selecting `driver: "none"` in `zolt.config.ts` means the application has no database; calling `createDatabaseClient` with `"none"` throws.
