import assert from "node:assert/strict";
import test from "node:test";
import { createZoltServer, registerTenantRoute } from "../dist/index.js";

test("serves health, OpenAPI, and hardened responses", async () => {
  const app = await createZoltServer({ name: "test", logger: false, rateLimit: false });
  const health = await app.inject({ method: "GET", url: "/api/health" });
  assert.equal(health.statusCode, 200);
  assert.equal(health.json().framework, "zolt");
  assert.equal(health.headers["x-content-type-options"], "nosniff");
  const openapi = await app.inject({ method: "GET", url: "/openapi.json" });
  assert.equal(openapi.statusCode, 200);
  assert.equal(openapi.json().openapi, "3.1.0");
  await app.close();
});

test("tenant routes reject header-only tenant escalation", async () => {
  const app = await createZoltServer({ name: "test", logger: false, rateLimit: false });
  registerTenantRoute(app, { method: "GET", url: "/api/private", handler: (_request, _reply, context) => ({ tenantId: context.tenantId }) }, async () => ({ subject: "user-1", tenantIds: ["tenant-a"] }));
  const denied = await app.inject({ method: "GET", url: "/api/private", headers: { "x-tenant-id": "tenant-b" } });
  assert.equal(denied.statusCode, 403);
  const allowed = await app.inject({ method: "GET", url: "/api/private", headers: { "x-tenant-id": "tenant-a" } });
  assert.equal(allowed.statusCode, 200);
  await app.close();
});

test("rejects invalid JSON bodies without exposing internals", async () => {
  const app = await createZoltServer({ name: "test", logger: false, rateLimit: false });
  app.post("/api/items", {
    schema: { body: { type: "object", additionalProperties: false, required: ["name"], properties: { name: { type: "string", minLength: 1 } } } }
  }, async (request) => request.body);
  const response = await app.inject({ method: "POST", url: "/api/items", payload: { unexpected: true } });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().statusCode, 400);
  assert.equal("stack" in response.json(), false);
  await app.close();
});
