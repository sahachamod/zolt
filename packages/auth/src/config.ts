export type AuthProvider = "local" | "asgardeo" | "keycloak" | "oidc" | "none";

export interface LocalAuthConfig {
  provider: "local";
  /** This value is sensitive. Do not log or serialize the configuration object. */
  pepper?: string;
}

export interface OidcAuthConfig {
  provider: "asgardeo" | "keycloak" | "oidc";
  issuer: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
}

export interface DisabledAuthConfig { provider: "none" }
export type AuthConfig = LocalAuthConfig | OidcAuthConfig | DisabledAuthConfig;
export type Environment = Record<string, string | undefined>;

function required(env: Environment, names: string[]): string {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`Authentication configuration is incomplete. Set ${names.join(" or ")} in .env.`);
}

function optional(env: Environment, names: string[]): string | undefined {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function secureUrl(value: string, name: string): string {
  const url = new URL(value);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  if (url.protocol !== "https:" && !local) throw new Error(`${name} must use HTTPS outside localhost.`);
  return url.toString().replace(/\/$/, "");
}

function oidcBase(provider: OidcAuthConfig["provider"], env: Environment): OidcAuthConfig {
  let issuer = optional(env, ["AUTH_ISSUER_URL"]);
  if (!issuer && provider === "asgardeo") {
    const organization = required(env, ["ASGARDEO_ORGANIZATION"]);
    issuer = `https://api.asgardeo.io/t/${encodeURIComponent(organization)}/oauth2/token`;
  }
  if (!issuer && provider === "keycloak") {
    const base = required(env, ["KEYCLOAK_BASE_URL"]).replace(/\/$/, "");
    const realm = required(env, ["KEYCLOAK_REALM"]);
    issuer = `${base}/realms/${encodeURIComponent(realm)}`;
  }
  return {
    provider,
    issuer: secureUrl(required({ AUTH_ISSUER_URL: issuer }, ["AUTH_ISSUER_URL"]), "AUTH_ISSUER_URL"),
    clientId: required(env, ["AUTH_CLIENT_ID", provider === "asgardeo" ? "ASGARDEO_CLIENT_ID" : "KEYCLOAK_CLIENT_ID"]),
    clientSecret: optional(env, ["AUTH_CLIENT_SECRET", provider === "asgardeo" ? "ASGARDEO_CLIENT_SECRET" : "KEYCLOAK_CLIENT_SECRET"]),
    redirectUri: secureUrl(required(env, ["AUTH_REDIRECT_URI"]), "AUTH_REDIRECT_URI"),
    scopes: (env.AUTH_SCOPES ?? "openid profile email").split(/\s+/).filter(Boolean)
  };
}

export function authConfigFromEnv(env: Environment = process.env): AuthConfig {
  const raw = (env.AUTH_PROVIDER ?? "local").trim().toLowerCase();
  const provider = raw === "argon2" ? "local" : raw;
  if (provider === "none") return { provider: "none" };
  if (provider === "local") return { provider: "local", pepper: optional(env, ["AUTH_PASSWORD_PEPPER"]) };
  if (provider === "asgardeo" || provider === "keycloak" || provider === "oidc") return oidcBase(provider, env);
  throw new Error(`Unsupported AUTH_PROVIDER \"${raw}\". Choose local, asgardeo, keycloak, oidc, or none.`);
}

export function publicAuthConfig(config: AuthConfig): Record<string, unknown> {
  if (config.provider === "local" || config.provider === "none") return { provider: config.provider };
  return { provider: config.provider, issuer: config.issuer, clientId: config.clientId, redirectUri: config.redirectUri, scopes: config.scopes };
}
