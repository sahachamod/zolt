import { createHmac } from "node:crypto";
import { hashPassword, verifyPassword } from "./password.js";

export type TenantId = string & { readonly __tenantId: unique symbol };

export interface AuthenticatedPrincipal {
  subject: string;
  tenantIds: readonly string[];
  platformAdmin?: boolean;
}

export interface TenantContext {
  tenantId: TenantId;
  subject: string;
  platformAdmin: boolean;
}

export class TenantAccessError extends Error {
  override readonly name = "TenantAccessError";
  readonly statusCode = 403;
  constructor() { super("Access to the requested tenant is denied."); }
}

export function parseTenantId(value: string): TenantId {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(normalized)) throw new Error("Tenant ID must be 2-64 lowercase letters, numbers, underscores, or hyphens.");
  return normalized as TenantId;
}

/** Authorize a tenant selector against membership from a server-verified identity. */
export function authorizeTenant(principal: AuthenticatedPrincipal, requestedTenantId: string): TenantContext {
  const tenantId = parseTenantId(requestedTenantId);
  const memberships = principal.tenantIds.map(parseTenantId);
  if (!principal.subject || (!principal.platformAdmin && !memberships.includes(tenantId))) throw new TenantAccessError();
  return { tenantId, subject: principal.subject, platformAdmin: principal.platformAdmin === true };
}

/** Prefix cache, storage, queue, and rate-limit keys so tenant data cannot share a key accidentally. */
export function tenantResourceKey(context: Pick<TenantContext, "tenantId">, ...segments: string[]): string {
  const clean = segments.map((segment) => {
    const value = segment.trim();
    if (!value || value.includes(":")) throw new Error("Tenant resource key segments must be non-empty and cannot contain colons.");
    return value;
  });
  return ["tenant", context.tenantId, ...clean].join(":");
}

function tenantPepper(masterPepper: string | Buffer, tenantId: TenantId): Buffer {
  if (masterPepper.length < 32) throw new Error("AUTH_PASSWORD_PEPPER must be at least 32 characters for tenant-bound password hashing.");
  return createHmac("sha256", masterPepper).update(`zolt:tenant:${tenantId}`).digest();
}

export async function hashTenantPassword(tenantId: string, password: string, masterPepper: string | Buffer): Promise<string> {
  return await hashPassword(password, { pepper: tenantPepper(masterPepper, parseTenantId(tenantId)) });
}

export async function verifyTenantPassword(tenantId: string, digest: string, password: string, masterPepper: string | Buffer): Promise<boolean> {
  return await verifyPassword(digest, password, { pepper: tenantPepper(masterPepper, parseTenantId(tenantId)) });
}
