import assert from "node:assert/strict";
import test from "node:test";
import { loadServiceConfig, serviceConfigSummary } from "../dist/index.js";

test("loads safe defaults", () => {
  assert.deepEqual(serviceConfigSummary(loadServiceConfig({})), { tenant: "default", storage: "none", mail: "none", database: "none", cryptography: "not configured" });
});

test("validates selected SMTP and bucket configuration", () => {
  const config = loadServiceConfig({ DEFAULT_TENANT_ID: "acme", STORAGE_PROVIDER: "s3", STORAGE_BUCKET: "private-files", STORAGE_REGION: "eu-west-1", MAIL_PROVIDER: "smtp", MAIL_FROM: "security@example.com", SMTP_HOST: "smtp.example.com", SMTP_PORT: "465", SMTP_SECURE: "true" });
  assert.equal(config.storage.bucket, "private-files");
  assert.equal(config.mail.secure, true);
  assert.throws(() => loadServiceConfig({ STORAGE_PROVIDER: "s3" }), /STORAGE_BUCKET/);
});

test("validates database driver and requires a connection URL", () => {
  const config = loadServiceConfig({ DATABASE_DRIVER: "postgres", DATABASE_URL: "postgres://localhost:5432/app" });
  assert.equal(config.database.driver, "postgres");
  assert.equal(config.database.url, "postgres://localhost:5432/app");
  assert.equal(config.database.pool, undefined);
  assert.throws(() => loadServiceConfig({ DATABASE_DRIVER: "postgres" }), /DATABASE_URL/);
  assert.throws(() => loadServiceConfig({ DATABASE_DRIVER: "oracle" }), /DATABASE_DRIVER/);
});

test("parses optional database pool tuning from the environment", () => {
  const config = loadServiceConfig({
    DATABASE_DRIVER: "postgres", DATABASE_URL: "postgres://localhost:5432/app",
    DATABASE_POOL_MAX: "10", DATABASE_POOL_IDLE_TIMEOUT_MS: "30000", DATABASE_POOL_CONNECTION_TIMEOUT_MS: "5000"
  });
  assert.deepEqual(config.database.pool, { max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 });
  assert.throws(() => loadServiceConfig({ DATABASE_DRIVER: "postgres", DATABASE_URL: "postgres://localhost:5432/app", DATABASE_POOL_MAX: "not-a-number" }), /DATABASE_POOL_MAX/);
});
