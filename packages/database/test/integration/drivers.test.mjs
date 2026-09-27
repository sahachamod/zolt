import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import test, { after, before, describe } from "node:test";
import { createDatabaseClient, runMigrations } from "../../dist/index.js";

const POSTGRES_PORT = 55432;
const MYSQL_PORT = 53306;
const MONGO_PORT = 57017;
const NAMES = {
  postgres: "zolt-db-test-postgres",
  mysql: "zolt-db-test-mysql",
  mongodb: "zolt-db-test-mongodb"
};

function docker(args) {
  return spawnSync("docker", args, { encoding: "utf8" });
}

function removeContainer(name) {
  docker(["rm", "-f", name]);
}

async function waitUntilReady(check, { timeoutMs = 60_000, intervalMs = 500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      await check();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  throw new Error(`Timed out waiting for readiness: ${lastError?.message ?? lastError}`);
}

before(() => {
  const dockerAvailable = docker(["version"]).status === 0;
  if (!dockerAvailable) throw new Error("Docker is required for integration tests but is not available.");
  for (const name of Object.values(NAMES)) removeContainer(name);

  execFileSync("docker", ["run", "-d", "--name", NAMES.postgres, "-e", "POSTGRES_PASSWORD=zolt", "-e", "POSTGRES_DB=zolt", "-p", `${POSTGRES_PORT}:5432`, "postgres:18-alpine"]);
  execFileSync("docker", ["run", "-d", "--name", NAMES.mysql, "-e", "MYSQL_ROOT_PASSWORD=zolt", "-e", "MYSQL_DATABASE=zolt", "-p", `${MYSQL_PORT}:3306`, "mysql:9"]);
  execFileSync("docker", ["run", "-d", "--name", NAMES.mongodb, "-p", `${MONGO_PORT}:27017`, "mongo:8"]);
});

after(() => {
  for (const name of Object.values(NAMES)) removeContainer(name);
});

describe("postgres integration", () => {
  const url = `postgres://postgres:zolt@127.0.0.1:${POSTGRES_PORT}/zolt`;
  let db;

  before(async () => {
    await waitUntilReady(async () => {
      const client = await createDatabaseClient({ driver: "postgres", url, retry: { attempts: 1 } });
      await client.query("SELECT 1");
      db = client;
    });
  });

  after(async () => {
    await db?.close();
  });

  test("creates a table, inserts, and queries real rows", async () => {
    await db.execute("CREATE TABLE IF NOT EXISTS widgets (id SERIAL PRIMARY KEY, name TEXT NOT NULL)");
    await db.execute("DELETE FROM widgets");
    const inserted = await db.execute("INSERT INTO widgets (name) VALUES ($1)", ["gear"]);
    assert.equal(inserted.affectedRows, 1);
    const { rows } = await db.query("SELECT name FROM widgets WHERE name = $1", ["gear"]);
    assert.equal(rows[0].name, "gear");
  });

  test("commits a successful transaction", async () => {
    await db.execute("CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY, balance INTEGER NOT NULL)");
    await db.execute("DELETE FROM accounts");
    await db.execute("INSERT INTO accounts (id, balance) VALUES (1, 100)");
    await db.transaction(async (tx) => {
      await tx.execute("UPDATE accounts SET balance = balance - 30 WHERE id = 1");
    });
    const { rows } = await db.query("SELECT balance FROM accounts WHERE id = 1");
    assert.equal(rows[0].balance, 70);
  });

  test("rolls back a failed transaction", async () => {
    await db.execute("UPDATE accounts SET balance = 100 WHERE id = 1");
    await assert.rejects(
      db.transaction(async (tx) => {
        await tx.execute("UPDATE accounts SET balance = balance - 30 WHERE id = 1");
        throw new Error("simulated failure");
      })
    );
    const { rows } = await db.query("SELECT balance FROM accounts WHERE id = 1");
    assert.equal(rows[0].balance, 100);
  });

  test("runMigrations applies once against a real server", async () => {
    await db.execute("DROP TABLE IF EXISTS _zolt_migrations");
    await db.execute("DROP TABLE IF EXISTS migrated_items");
    const migrations = [{ id: "001_create_migrated_items", up: async (client) => { await client.execute("CREATE TABLE migrated_items (id SERIAL PRIMARY KEY)"); } }];
    assert.deepEqual(await runMigrations(db, migrations), ["001_create_migrated_items"]);
    assert.deepEqual(await runMigrations(db, migrations), []);
  });
});

describe("mysql integration", () => {
  const url = `mysql://root:zolt@127.0.0.1:${MYSQL_PORT}/zolt`;
  let db;

  before(async () => {
    await waitUntilReady(async () => {
      const client = await createDatabaseClient({ driver: "mysql", url, retry: { attempts: 1 } });
      await client.query("SELECT 1");
      db = client;
    }, { timeoutMs: 90_000 });
  });

  after(async () => {
    await db?.close();
  });

  test("creates a table, inserts, and queries real rows", async () => {
    await db.execute("CREATE TABLE IF NOT EXISTS widgets (id INTEGER PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255) NOT NULL)");
    await db.execute("DELETE FROM widgets");
    const inserted = await db.execute("INSERT INTO widgets (name) VALUES (?)", ["gear"]);
    assert.equal(inserted.affectedRows, 1);
    assert.ok(inserted.insertId);
    const { rows } = await db.query("SELECT name FROM widgets WHERE name = ?", ["gear"]);
    assert.equal(rows[0].name, "gear");
  });

  test("commits a successful transaction", async () => {
    await db.execute("CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY, balance INTEGER NOT NULL)");
    await db.execute("DELETE FROM accounts");
    await db.execute("INSERT INTO accounts (id, balance) VALUES (1, 100)");
    await db.transaction(async (tx) => {
      await tx.execute("UPDATE accounts SET balance = balance - 30 WHERE id = 1");
    });
    const { rows } = await db.query("SELECT balance FROM accounts WHERE id = 1");
    assert.equal(rows[0].balance, 70);
  });

  test("rolls back a failed transaction", async () => {
    await db.execute("UPDATE accounts SET balance = 100 WHERE id = 1");
    await assert.rejects(
      db.transaction(async (tx) => {
        await tx.execute("UPDATE accounts SET balance = balance - 30 WHERE id = 1");
        throw new Error("simulated failure");
      })
    );
    const { rows } = await db.query("SELECT balance FROM accounts WHERE id = 1");
    assert.equal(rows[0].balance, 100);
  });

  test("runMigrations applies once against a real server", async () => {
    await db.execute("DROP TABLE IF EXISTS _zolt_migrations");
    await db.execute("DROP TABLE IF EXISTS migrated_items");
    const migrations = [{ id: "001_create_migrated_items", up: async (client) => { await client.execute("CREATE TABLE migrated_items (id INTEGER PRIMARY KEY AUTO_INCREMENT)"); } }];
    assert.deepEqual(await runMigrations(db, migrations), ["001_create_migrated_items"]);
    assert.deepEqual(await runMigrations(db, migrations), []);
  });
});

describe("mongodb integration", () => {
  const url = `mongodb://127.0.0.1:${MONGO_PORT}/zolt`;
  let db;

  before(async () => {
    await waitUntilReady(async () => {
      const client = await createDatabaseClient({ driver: "mongodb", url, retry: { attempts: 1 } });
      await client.database().command({ ping: 1 });
      db = client;
    });
  });

  after(async () => {
    await db?.close();
  });

  test("inserts and queries real documents", async () => {
    const collection = db.database().collection("widgets");
    await collection.deleteMany({});
    await collection.insertOne({ name: "gear" });
    const found = await collection.findOne({ name: "gear" });
    assert.equal(found.name, "gear");
  });

  test("runMigrations applies once against a real server", async () => {
    await db.database().collection("_zolt_migrations").deleteMany({});
    await db.database().collection("migrated_items").deleteMany({});
    const migrations = [{ id: "001_seed_migrated_items", up: async (client) => { await client.database().collection("migrated_items").insertOne({ seeded: true }); } }];
    assert.deepEqual(await runMigrations(db, migrations), ["001_seed_migrated_items"]);
    assert.deepEqual(await runMigrations(db, migrations), []);
    const count = await db.database().collection("migrated_items").countDocuments();
    assert.equal(count, 1);
  });
});
