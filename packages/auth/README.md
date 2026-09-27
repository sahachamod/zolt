# @zolt-framework/auth

Zolt authentication primitives:

- Argon2id password hashing and verification using OWASP's minimum profile.
- Local authentication as the default provider.
- Environment-based WSO2 Asgardeo, Keycloak, and generic OIDC configuration.
- OIDC discovery, PKCE generation, and authorization URL construction.
- Server-verified tenant authorization, tenant-scoped resource keys, and tenant-derived password peppers.

```ts
import { authConfigFromEnv, hashPassword, verifyPassword } from "@zolt-framework/auth";

const auth = authConfigFromEnv();
const digest = await hashPassword(password, { pepper: process.env.AUTH_PASSWORD_PEPPER });
const valid = await verifyPassword(digest, password, { pepper: process.env.AUTH_PASSWORD_PEPPER });
```

Never log configuration objects containing secrets. Store password hashes, not passwords. Store a pepper in a deployment secret manager rather than the database.
