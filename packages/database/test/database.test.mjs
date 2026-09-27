import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseClient, isSqlClient, runMigrations, DatabaseError } from "../dist/index.js";

test("sqlite driver creates a table, writes, and queries rows", async () => {
  const db = await createDatabaseClient({ driver: "sqlite", url: "sqlite::memory:" });
  assert.equal(db.driver, "sqlite");
  assert.ok(isSqlClient(db));
  await db.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL)");
  const inserted = await db.execute("INSERT INTO users (email) VALUES (?)", ["ada@example.com"]);
  assert.equal(inserted.affectedRows, 1);
  const { rows, rowCount } = await db.query("SELECT id, email FROM users WHERE email = ?", ["ada@example.com"]);
  assert.equal(rowCount, 1);
  assert.equal(rows[0].email, "ada@example.com");
  await db.close();
});

test("rejects driver \"none\"", async () => {
  await assert.rejects(() => createDatabaseClient({ driver: "none", url: "" }), /driver is "none"/);
});

test("a postgres client fails a real query against an unreachable server", async () => {
  const db = await createDatabaseClient({ driver: "postgres", url: "postgres://127.0.0.1:1/invalid" });
  await assert.rejects(() => db.query("SELECT 1"));
  await db.close();
});

test("rejects an unsupported driver", async () => {
  await assert.rejects(
    () => createDatabaseClient({ driver: "oracle", url: "" }),
    /Unsupported database driver/
  );
});

test("a committed transaction persists writes", async () => {
  const db = await createDatabaseClient({ driver: "sqlite", url: "sqlite::memory:" });
  await db.execute("CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance INTEGER NOT NULL)");
  await db.transaction(async (tx) => {
    await tx.execute("INSERT INTO accounts (id, balance) VALUES (1, 100)");
    await tx.execute("UPDATE accounts SET balance = balance - 30 WHERE id = 1");
  });
  const { rows } = await db.query("SELECT balance FROM accounts WHERE id = 1");
  assert.equal(rows[0].balance, 70);
  await db.close();
});

test("a failed transaction rolls back all writes", async () => {
  const db = await createDatabaseClient({ driver: "sqlite", url: "sqlite::memory:" });
  await db.execute("CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance INTEGER NOT NULL)");
  await db.execute("INSERT INTO accounts (id, balance) VALUES (1, 100)");
  await assert.rejects(
    db.transaction(async (tx) => {
      await tx.execute("UPDATE accounts SET balance = balance - 30 WHERE id = 1");
      throw new Error("simulated failure mid-transaction");
    }),
    /simulated failure mid-transaction/
  );
  const { rows } = await db.query("SELECT balance FROM accounts WHERE id = 1");
  assert.equal(rows[0].balance, 100);
  await db.close();
});

test("runMigrations applies pending migrations once and skips them on a second run", async () => {
  const db = await createDatabaseClient({ driver: "sqlite", url: "sqlite::memory:" });
  const migrations = [
    { id: "001_create_widgets", up: async (client) => { await client.execute("CREATE TABLE widgets (id INTEGER PRIMARY KEY, name TEXT NOT NULL)"); } },
    { id: "002_seed_widgets", up: async (client) => { await client.execute("INSERT INTO widgets (name) VALUES ('gear')"); } }
  ];
  const firstRun = await runMigrations(db, migrations);
  assert.deepEqual(firstRun, ["001_create_widgets", "002_seed_widgets"]);
  const secondRun = await runMigrations(db, migrations);
  assert.deepEqual(secondRun, []);
  const { rows } = await db.query("SELECT name FROM widgets");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "gear");
  await db.close();
});

test("a query error is wrapped in a DatabaseError with driver context", async () => {
  const db = await createDatabaseClient({ driver: "sqlite", url: "sqlite::memory:" });
  await assert.rejects(db.query("SELECT * FROM missing_table"), (error) => {
    assert.ok(error instanceof DatabaseError);
    assert.equal(error.driver, "sqlite");
    return true;
  });
  await db.close();
});

test("connection pool options are accepted for postgres", async () => {
  const db = await createDatabaseClient({
    driver: "postgres",
    url: "postgres://127.0.0.1:1/invalid",
    pool: { max: 5, idleTimeoutMillis: 1000, connectionTimeoutMillis: 500 }
  });
  await assert.rejects(() => db.query("SELECT 1"));
  await db.close();
});
