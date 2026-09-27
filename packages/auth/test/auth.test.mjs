import assert from "node:assert/strict";
import test from "node:test";
import { authConfigFromEnv, authorizeTenant, hashPassword, hashTenantPassword, passwordNeedsRehash, publicAuthConfig, tenantResourceKey, verifyPassword, verifyTenantPassword } from "../dist/index.js";

test("Argon2id hashes and verifies passwords without deterministic salts", async () => {
  const first = await hashPassword("correct horse battery staple", { pepper: "test-only-pepper" });
  const second = await hashPassword("correct horse battery staple", { pepper: "test-only-pepper" });
  assert.match(first, /^\$argon2id\$/);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(first, "correct horse battery staple", { pepper: "test-only-pepper" }), true);
  assert.equal(await verifyPassword(first, "wrong", { pepper: "test-only-pepper" }), false);
  assert.equal(passwordNeedsRehash(first), false);
});

test("local authentication is the default and public config removes its pepper", () => {
  const config = authConfigFromEnv({ AUTH_PASSWORD_PEPPER: "secret" });
  assert.deepEqual(publicAuthConfig(config), { provider: "local" });
});

test("builds Asgardeo and Keycloak issuer settings from environment", () => {
  const common = { AUTH_CLIENT_ID: "client", AUTH_REDIRECT_URI: "http://localhost:3000/auth/callback" };
  assert.equal(authConfigFromEnv({ ...common, AUTH_PROVIDER: "asgardeo", ASGARDEO_ORGANIZATION: "example.com" }).issuer, "https://api.asgardeo.io/t/example.com/oauth2/token");
  assert.equal(authConfigFromEnv({ ...common, AUTH_PROVIDER: "keycloak", KEYCLOAK_BASE_URL: "https://id.example.com/", KEYCLOAK_REALM: "main" }).issuer, "https://id.example.com/realms/main");
});

test("tenant context requires verified membership and isolates password verification", async () => {
  const context = authorizeTenant({ subject: "user-1", tenantIds: ["acme", "beta"] }, "acme");
  assert.equal(tenantResourceKey(context, "users", "user-1"), "tenant:acme:users:user-1");
  assert.throws(() => authorizeTenant({ subject: "user-1", tenantIds: ["beta"] }, "acme"), /denied/);
  const pepper = "a-development-pepper-that-is-long-enough";
  const digest = await hashTenantPassword("acme", "correct horse battery staple", pepper);
  assert.equal(await verifyTenantPassword("acme", digest, "correct horse battery staple", pepper), true);
  assert.equal(await verifyTenantPassword("beta", digest, "correct horse battery staple", pepper), false);
});
