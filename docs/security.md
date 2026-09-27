# Security

Generated environment files contain blank placeholders. `.env` is ignored while `.env.example` is committed. Local credentials use Argon2id; optional peppers and OIDC client secrets remain server-only. Release validation scans for common tokens, private keys, and environment files, then runs the production dependency audit. Errors never include secret values.

`@zolt/security` exposes AES-256-GCM authenticated encryption bound to tenant identity, HMAC-SHA-256, SHA-256/SHA-512 digests, and secure random tokens. It intentionally omits ECB, unauthenticated CBC, MD5, SHA-1, and custom algorithms. Run `zolt env:init` for local secrets; use a KMS, HSM, or secret vault with rotation and key IDs in production.

Tenant identifiers are not authorization credentials. Always derive tenant membership from a validated session/token and use the authorized tenant context for every tenant-owned lookup.
