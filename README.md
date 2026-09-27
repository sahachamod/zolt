# Zolt

Zolt is a tenant-first TypeScript application framework: typed configuration, Argon2id/OIDC authentication, authenticated cryptography, a unified database client (postgres/mysql/sqlite/mongodb), environment validation, a Fastify runtime, React/Vite/Tailwind templates, and a CLI that scaffolds all of it.

This repo is a pnpm monorepo containing the framework packages, the `create-zolt` scaffolder, application templates, and documentation.

## Use Zolt in your own project

You don't need to clone this repo to build with Zolt — the CLI scaffolds a standalone project:

```bash
npx create-zolt@latest my-app
cd my-app
zolt dev
```

Open http://localhost:3000.

Automated (no prompts):

```bash
npx create-zolt@latest my-app --yes
npx create-zolt@latest api-app --template api --database postgres --ui tailwind --infra docker --testing full --git
npx create-zolt@latest secure-api --template api --auth keycloak --storage s3 --mail ses --yes
```

Run `npx create-zolt@latest --help` for every flag. Existing files are never overwritten unless you confirm or pass `--force`.

| Flag | Values |
| --- | --- |
| `--template` | `atlas` (full-stack), `api`, `ssr`, `minimal` |
| `--database` | `postgres`, `mysql`, `sqlite`, `mongodb`, `none` |
| `--auth` | `local`, `asgardeo`, `keycloak`, `oidc`, `none` |
| `--storage` | `none`, `local`, `s3`, `gcs`, `azure` |
| `--mail` | `none`, `smtp`, `ses`, `sendgrid`, `mailgun` |
| `--ui` | `zolt`, `tailwind`, `none` |
| `--infra` | `docker`, `docker-kubernetes`, `terraform-ansible`, `full`, `none` |
| `--testing` | `full`, `basic`, `none` |

### Requirements

- Node.js 22.12+ (CI tests Node 22 and 24)
- npm 10+ or pnpm 10
- Git is optional for generated projects

### The generated CLI

Every generated project installs `@zolt-framework/cli`, so nothing global is required. Use `npx zolt <command>`, `npm run <script>`, or `pnpm zolt <command>` — those always resolve the local binary. A bare `zolt` works only if `node_modules/.bin` is on your shell's `PATH`.

```bash
zolt dev          # start the dev server
zolt build         # production build
zolt start         # serve the production build
zolt test          # run the project's tests
zolt doctor        # diagnose environment/toolchain issues
zolt env:init      # generate missing secrets into .env
zolt env:check     # validate .env against the selected providers
zolt postman       # (re)generate a Postman collection for API templates
zolt list          # list available templates
```

## What's in the box (0.1)

- Type-safe `zolt.config.ts`
- Local authentication (Argon2id) plus environment-configured Asgardeo, Keycloak, or generic OIDC
- Mandatory tenant-aware authorization helpers, tenant-bound password/encryption primitives
- AES-256-GCM, HMAC-SHA-256, safe digests, cryptographic random tokens
- `@zolt-framework/database` — a unified client for postgres, mysql, sqlite, and mongodb with connection pooling, retries, transactions, and a migration runner, wired into the Fastify runtime (see [docs/database.md](docs/database.md))
- Validated local/S3/GCS/Azure storage and SMTP/SES/SendGrid/Mailgun configuration
- Fastify 5 runtime: schema validation, OpenAPI, rate limiting, secure headers, graceful shutdown
- React TSX via Vite 8, Tailwind (dark mode, tokens, forms, typography, focus styles, motion)
- Four templates: `atlas` (full-stack), `api`, `ssr`, `minimal`
- Optional Docker, Kubernetes, Terraform, and Ansible file generation
- Cross-platform CLI diagnostics, dev/build/test/serve, Postman collection generation
- Clean npm tarballs, validated against a real external install (see [Testing](#testing) below)

Planned, not yet shipped: an ORM/schema layer, a component library, a complete authentication/session adapter, and true SSR. See [docs/orm.md](docs/orm.md) for the current boundary between `@zolt-framework/database` (shipped) and an ORM (not shipped).

## Repository layout

```
packages/
  core/       @zolt-framework/core       — config types, defineConfig(), Postman collection generation
  config/     @zolt-framework/config     — validated environment/service configuration loader
  security/   @zolt-framework/security   — AES-256-GCM, HMAC, digests, token generation
  auth/       @zolt-framework/auth       — Argon2id hashing, OIDC provider configuration, tenant authorization
  database/   @zolt-framework/database   — postgres/mysql/sqlite/mongodb client, pooling, transactions, migrations
  http/       @zolt-framework/http       — Fastify application runtime
  cli/        @zolt-framework/cli        — the `zolt` command (dev/build/test/doctor/env/postman)
create-zolt/                   — the `create-zolt` scaffolder (npx entry point)
templates/                       — atlas / api / ssr / minimal project templates the scaffolder copies from
examples/                        — example applications
docs/                            — architecture, CLI, configuration, deployment, and per-feature guides
scripts/                         — release/pack/validate/security-check automation
```

Package dependency order (each depends only on packages above it): `core` → `config`, `security` → `auth`, `database` → `http` → `cli` → `create-zolt`.

## Developing Zolt itself

Clone the repo and install with pnpm (the package manager the workspace is built around):

```bash
git clone https://github.com/<your-org>/zolt.git
cd zolt
corepack enable
pnpm install
```

Common commands (all run across every workspace package):

```bash
pnpm build          # tsc build for every package
pnpm test           # unit tests (node:test) for every package
pnpm typecheck       # tsc --noEmit
pnpm lint            # alias for typecheck
pnpm validate:packages  # packs every publishable package, installs the tarballs into a scratch project, and exercises the generated app's dev/build/test lifecycle end to end
pnpm security:check  # scans for accidentally committed secrets/keys
pnpm run ci          # the full pipeline CI runs: lint, typecheck, test, build, validate:packages
```

To work on a single package, `cd packages/<name>` and run its own `build`/`test`/`typecheck` scripts — each package builds and tests independently.

### Testing

Unit tests (`pnpm test`) run everywhere with no external dependencies — they're what CI runs on every push and PR, across Linux/Windows/macOS and Node 22/24.

`@zolt-framework/database` additionally ships real integration tests against actual postgres, mysql, and mongodb containers (not mocks): transactions, rollbacks, retries, and migrations are verified against real servers. Run them with Docker running locally:

```bash
cd packages/database
pnpm test:integration
```

This starts throwaway containers on non-default ports, waits for readiness, runs the suite, and tears everything down even on failure — it won't touch other containers you have running.

### Making a change

1. Branch from `main`.
2. Make the change in the relevant package(s). If it changes a package's public behavior, update that package's tests.
3. If it changes what a generated project contains, update the relevant `templates/*` files and, if applicable, `docs/`.
4. Run `pnpm run ci` locally before opening a PR — it's the same pipeline GitHub Actions runs.
5. Open a focused PR. Architecture decisions that need a record belong in `docs/adr/`.

## Documentation

| Topic | Doc |
| --- | --- |
| Getting started | [docs/getting-started.md](docs/getting-started.md) |
| Installation | [docs/installation.md](docs/installation.md) |
| Architecture | [docs/architecture.md](docs/architecture.md) |
| CLI reference | [docs/cli.md](docs/cli.md) |
| Configuration | [docs/configuration.md](docs/configuration.md) |
| Authentication | [docs/authentication.md](docs/authentication.md) |
| Database | [docs/database.md](docs/database.md) |
| ORM (planned) | [docs/orm.md](docs/orm.md) |
| Frontend / Tailwind | [docs/frontend.md](docs/frontend.md), [docs/tailwind.md](docs/tailwind.md) |
| Security | [docs/security.md](docs/security.md) |
| Testing | [docs/testing.md](docs/testing.md) |
| Deployment | [docs/deployment.md](docs/deployment.md) |
| Docker / Kubernetes / Terraform / Ansible | [docs/docker.md](docs/docker.md), [docs/kubernetes.md](docs/kubernetes.md), [docs/terraform.md](docs/terraform.md), [docs/ansible.md](docs/ansible.md) |
| Plugins | [docs/plugins.md](docs/plugins.md) |
| Releasing | [docs/releasing.md](docs/releasing.md) |
| Architecture decision records | [docs/adr/](docs/adr/) |

## Contributing

Open a focused pull request with tests. CI validates Node 22 and 24 on Linux, Windows, and macOS via `pnpm run ci`. Keep changes scoped to one package/concern per PR where possible — the dependency order above (`core` → `config`/`security` → `auth`/`database` → `http` → `cli` → `create-zolt`) is a good guide for how far a change ripples.

## License

MIT
