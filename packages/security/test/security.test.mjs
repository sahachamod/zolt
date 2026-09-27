import assert from "node:assert/strict";
import test from "node:test";
import { decryptForTenant, encryptForTenant, generateEncryptionKey, randomToken, signHmac, verifyHmac } from "../dist/index.js";

test("AES-256-GCM ciphertext is tenant-bound and authenticated", () => {
  const key = generateEncryptionKey();
  const encrypted = encryptForTenant("classified", { tenantId: "tenant-a", key, keyId: "primary" });
  assert.equal(decryptForTenant(encrypted, { tenantId: "tenant-a", key, keyId: "primary" }).toString(), "classified");
  assert.throws(() => decryptForTenant(encrypted, { tenantId: "tenant-b", key, keyId: "primary" }), /Unable to decrypt/);
  assert.throws(() => decryptForTenant(`${encrypted}x`, { tenantId: "tenant-a", key }), /Unable to decrypt/);
});

test("tokens and HMAC use secure primitives", () => {
  assert.ok(randomToken().length >= 43);
  const signature = signHmac("event", "secret-key");
  assert.equal(verifyHmac("event", signature, "secret-key"), true);
  assert.equal(verifyHmac("changed", signature, "secret-key"), false);
});
