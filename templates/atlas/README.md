# __PROJECT_NAME__

Generated with Zolt.

```bash
npm install
npx zolt dev
```

Open http://localhost:3000.

For secure local defaults, run `npx zolt env:init` followed by `npx zolt env:check`. The project is tenant-first: authorize tenant membership before using a tenant selector for data access.

Local Argon2id and external OIDC authentication primitives are configured in `server/auth.ts` and `.env`. Connect them to your user repository, session storage, and server routes before accepting credentials. Database and complete HTTP server adapters beyond the Vite web runtime are not implemented in Zolt 0.1.0.
