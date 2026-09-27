import assert from "node:assert/strict";
import test from "node:test";
import { createPostmanCollection, defineConfig, version } from "../dist/index.js";

test("defineConfig preserves a typed configuration", () => {
  const config = defineConfig({ app: { name: "test" } });
  assert.equal(config.app.name, "test");
  assert.equal(version, "0.1.0");
});

test("creates a tenant-aware Postman 2.1 collection", () => {
  const collection = createPostmanCollection("demo", { routes: [{ name: "Health", method: "GET", path: "/api/health" }] });
  assert.equal(collection.info.schema, "https://schema.getpostman.com/json/collection/v2.1.0/collection.json");
  assert.equal(collection.item[0].request.header[0].key, "X-Tenant-ID");
});
