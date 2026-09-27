# Authentication

Local authentication is the default. `@zolt-framework/auth` hashes passwords with Argon2id using OWASP's minimum profile (19 MiB memory, two iterations, one lane), random salts, and an optional server-side pepper from `AUTH_PASSWORD_PEPPER`. Passwords must be hashed only on the server.

Generated applications are tenant-first. `authorizeTenant` validates a requested tenant against memberships from an already authenticated server-side principal. Client headers and query parameters are selectors only. Tenant password helpers derive separate peppers from the master pepper, and `tenantResourceKey` creates explicit cache/storage/queue namespaces.

Set `AUTH_PROVIDER` to `asgardeo`, `keycloak`, or `oidc` to use an external identity provider. Provider issuer, client, redirect, scope, and secret values come from `.env`; the client secret is never exposed through `VITE_*`. Asgardeo organization and Keycloak base URL/realm shortcuts are supported. The package provides discovery, PKCE, and authorization URL primitives. Token exchange, validation, sessions, CSRF handling, and persistence must be connected in the future server adapter before declaring a complete sign-in route.

Set `AUTH_PROVIDER=none` to disable authentication. Use `publicAuthConfig` before sending any configuration to a browser or log sink.
