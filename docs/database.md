# Database

`@zolt-framework/database` provides a unified client across four drivers: `postgres` (via `pg`), `mysql` (via `mysql2`), `sqlite` (via Node's built-in `node:sqlite`, no install needed), and `mongodb` (via `mongodb`).

Select a driver at creation time:

```bash
npx create-zolt@latest my-app --template atlas --database postgres
```

The creator sets `DATABASE_DRIVER` in `.env.example`, adds the matching driver package (`pg`, `mysql2`, or `mongodb`) to `package.json` when relevant, and writes `database/client.ts`:

```ts
import { getDatabase } from "./database/client.js";

const db = await getDatabase();
```

`@zolt-framework/config`'s `loadServiceConfig()` validates `DATABASE_DRIVER` and requires `DATABASE_URL` for every driver except `none` — the creator never writes credentials, so `DATABASE_URL` starts blank in `.env` and must be supplied before the app can connect.

The generated `server/index.ts` passes the resolved client into `createZoltServer({ database })`, which decorates the Fastify instance as `app.db` and closes the client automatically on server shutdown.

There are no `db:*` CLI commands yet (migrations, seeding) — connect and query directly through the client returned by `getDatabase()`.
