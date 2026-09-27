import { argon2id, hash, needsRehash, verify } from "argon2";

export interface PasswordHashOptions {
  /** Optional server-side pepper. Keep it in a secret manager, never in the database. */
  pepper?: string | Buffer;
  memoryCost?: number;
  timeCost?: number;
  parallelism?: number;
}

export const ARGON2ID_PROFILE = Object.freeze({
  type: argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32
});

function passwordBytes(password: string): Buffer {
  if (typeof password !== "string" || password.length === 0) throw new TypeError("Password must be a non-empty string.");
  const bytes = Buffer.from(password, "utf8");
  if (bytes.byteLength > 1_024) throw new RangeError("Password exceeds the 1024-byte hashing limit.");
  return bytes;
}

function secret(pepper?: string | Buffer): Buffer | undefined {
  if (pepper === undefined || pepper.length === 0) return undefined;
  return Buffer.isBuffer(pepper) ? pepper : Buffer.from(pepper, "utf8");
}

export async function hashPassword(password: string, options: PasswordHashOptions = {}): Promise<string> {
  return await hash(passwordBytes(password), {
    ...ARGON2ID_PROFILE,
    memoryCost: options.memoryCost ?? ARGON2ID_PROFILE.memoryCost,
    timeCost: options.timeCost ?? ARGON2ID_PROFILE.timeCost,
    parallelism: options.parallelism ?? ARGON2ID_PROFILE.parallelism,
    secret: secret(options.pepper)
  });
}

export async function verifyPassword(encodedHash: string, password: string, options: Pick<PasswordHashOptions, "pepper"> = {}): Promise<boolean> {
  if (typeof encodedHash !== "string" || !encodedHash.startsWith("$argon2id$")) return false;
  try {
    return await verify(encodedHash, passwordBytes(password), { secret: secret(options.pepper) });
  } catch {
    return false;
  }
}

export function passwordNeedsRehash(encodedHash: string, options: PasswordHashOptions = {}): boolean {
  try {
    return needsRehash(encodedHash, {
      memoryCost: options.memoryCost ?? ARGON2ID_PROFILE.memoryCost,
      timeCost: options.timeCost ?? ARGON2ID_PROFILE.timeCost,
      parallelism: options.parallelism ?? ARGON2ID_PROFILE.parallelism
    });
  } catch {
    return true;
  }
}
