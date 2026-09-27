# Architecture

The pnpm workspace publishes `@zolt/core`, `@zolt/config`, `@zolt/security`, `@zolt/auth`, `@zolt/http`, `@zolt/cli`, and `create-zolt`. Templates remain repository source assets and are copied into the creator's `dist/templates` during its build. Generated projects therefore have no repository dependency.

Every generated project has an explicit default tenant. An untrusted tenant selector never grants access: applications authorize it against tenant memberships from a verified principal, then carry the resulting tenant context into database queries, cache keys, storage paths, queues, encryption, rate limits, and audit events.

The browser runtime is Vite + React. The application runtime is Fastify 5 with JSON-schema validation, OpenAPI 3.1, request IDs, secure headers, rate limiting, tenant route authorization, and static production serving. Zolt owns configuration, orchestration, diagnostics, and project generation. See [ADR 0001](adr/0001-distribution-architecture.md).
