import { authConfigFromEnv, authorizeTenant, hashTenantPassword, verifyTenantPassword, type AuthenticatedPrincipal } from "@zolt-framework/auth";
import { services } from "../config/services.js";

export const auth = authConfigFromEnv();

export function tenantContext(principal: AuthenticatedPrincipal, requestedTenantId = services.tenant.defaultId) {
  return authorizeTenant(principal, requestedTenantId);
}

export async function createPasswordDigest(password: string, tenantId = services.tenant.defaultId): Promise<string> {
  if (auth.provider !== "local") throw new Error("Password hashing is available only with AUTH_PROVIDER=local.");
  if (!auth.pepper) throw new Error("AUTH_PASSWORD_PEPPER is required. Run `zolt env:init` for local development.");
  return await hashTenantPassword(tenantId, password, auth.pepper);
}

export async function passwordMatches(digest: string, password: string, tenantId = services.tenant.defaultId): Promise<boolean> {
  if (auth.provider !== "local") return false;
  if (!auth.pepper) return false;
  return await verifyTenantPassword(tenantId, digest, password, auth.pepper);
}
