import { createHash, randomBytes } from "node:crypto";
import type { OidcAuthConfig } from "./config.js";

export interface OidcDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  userinfo_endpoint?: string;
  end_session_endpoint?: string;
  code_challenge_methods_supported?: string[];
}

export interface PkcePair { verifier: string; challenge: string }

function base64Url(value: Buffer): string {
  return value.toString("base64url");
}

export function generatePkcePair(): PkcePair {
  const verifier = base64Url(randomBytes(48));
  return { verifier, challenge: base64Url(createHash("sha256").update(verifier).digest()) };
}

export async function discoverOidcProvider(config: OidcAuthConfig, fetcher: typeof fetch = fetch): Promise<OidcDiscoveryDocument> {
  const discoveryUrl = `${config.issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
  const response = await fetcher(discoveryUrl, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`OIDC discovery failed for ${config.provider} with HTTP ${response.status}.`);
  const document = await response.json() as Partial<OidcDiscoveryDocument>;
  for (const field of ["issuer", "authorization_endpoint", "token_endpoint", "jwks_uri"] as const) {
    if (!document[field]) throw new Error(`OIDC discovery response is missing ${field}.`);
  }
  if (document.issuer!.replace(/\/$/, "") !== config.issuer.replace(/\/$/, "")) {
    throw new Error("OIDC discovery issuer does not match AUTH_ISSUER_URL.");
  }
  return document as OidcDiscoveryDocument;
}

export function createAuthorizationUrl(config: OidcAuthConfig, discovery: OidcDiscoveryDocument, input: { state: string; nonce: string; challenge: string }): URL {
  if (!input.state || !input.nonce || !input.challenge) throw new Error("OIDC state, nonce, and PKCE challenge are required.");
  const url = new URL(discovery.authorization_endpoint);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state: input.state,
    nonce: input.nonce,
    code_challenge: input.challenge,
    code_challenge_method: "S256"
  }).toString();
  return url;
}
