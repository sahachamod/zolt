import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type DigestAlgorithm = "sha256" | "sha512";

export interface TenantEncryptionOptions {
  tenantId: string;
  key: Buffer | string;
  keyId?: string;
}

const tenantPattern = /^[a-z0-9][a-z0-9_-]{1,63}$/;

function tenantId(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!tenantPattern.test(normalized)) throw new Error("Tenant ID must be 2-64 lowercase letters, numbers, underscores, or hyphens.");
  return normalized;
}

function keyBytes(key: Buffer | string): Buffer {
  const bytes = Buffer.isBuffer(key) ? key : Buffer.from(key, "base64");
  if (bytes.byteLength !== 32) throw new Error("AES-256-GCM requires a 32-byte base64 key.");
  return bytes;
}

export function generateEncryptionKey(): string {
  return randomBytes(32).toString("base64");
}

export function randomToken(bytes = 32): string {
  if (!Number.isInteger(bytes) || bytes < 16 || bytes > 1_024) throw new RangeError("Token size must be an integer from 16 to 1024 bytes.");
  return randomBytes(bytes).toString("base64url");
}

export function digest(value: string | Buffer, algorithm: DigestAlgorithm = "sha256"): string {
  return createHash(algorithm).update(value).digest("hex");
}

export function signHmac(value: string | Buffer, key: Buffer | string): string {
  return createHmac("sha256", key).update(value).digest("base64url");
}

export function verifyHmac(value: string | Buffer, signature: string, key: Buffer | string): boolean {
  try {
    const expected = Buffer.from(signHmac(value, key), "base64url");
    const actual = Buffer.from(signature, "base64url");
    return expected.byteLength === actual.byteLength && timingSafeEqual(expected, actual);
  } catch { return false; }
}

export function encryptForTenant(plaintext: string | Buffer, options: TenantEncryptionOptions): string {
  const tenant = tenantId(options.tenantId);
  const keyId = options.keyId?.trim() || "default";
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(keyId)) throw new Error("Key ID contains unsupported characters.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(options.key), iv, { authTagLength: 16 });
  cipher.setAAD(Buffer.from(`zolt:v1:tenant:${tenant}`, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return ["nx1", keyId, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptForTenant(envelope: string, options: TenantEncryptionOptions): Buffer {
  const tenant = tenantId(options.tenantId);
  const [version, keyId, ivValue, tagValue, ciphertextValue, extra] = envelope.split(".");
  if (version !== "nx1" || !keyId || !ivValue || !tagValue || ciphertextValue === undefined || extra !== undefined) throw new Error("Invalid encrypted envelope.");
  if (options.keyId && options.keyId !== keyId) throw new Error("Encrypted envelope key ID does not match the supplied key.");
  try {
    const decipher = createDecipheriv("aes-256-gcm", keyBytes(options.key), Buffer.from(ivValue, "base64url"), { authTagLength: 16 });
    decipher.setAAD(Buffer.from(`zolt:v1:tenant:${tenant}`, "utf8"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]);
  } catch {
    throw new Error("Unable to decrypt data. The tenant, key, or ciphertext is invalid.");
  }
}
