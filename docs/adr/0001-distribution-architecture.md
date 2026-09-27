# ADR 0001: Distribution architecture

- Status: Accepted
- Date: 2026-09-27

## Context

This repository began as an empty workspace. Zolt therefore needs a small, testable distribution foundation without publishing packages for unimplemented subsystems.

## Decision

Zolt is a pnpm workspace with seven publishable packages:

- `@zolt-framework/core` owns public configuration types and `defineConfig`.
- `@zolt-framework/auth` owns Argon2id password primitives and environment-driven OIDC provider configuration.
- `@zolt-framework/config` validates tenant, storage, mail, and cryptography environment settings.
- `@zolt-framework/security` owns tenant-bound AES-256-GCM, HMAC, digests, and secure-token primitives.
- `@zolt-framework/http` owns the Fastify application runtime, security defaults, OpenAPI, static delivery, and tenant-protected route registration.
- `@zolt-framework/cli` owns the portable `zolt` executable and lifecycle commands.
- `create-zolt` owns project prompts, safe template copying, option transforms, dependency installation, and optional Git initialization.

The source templates live in `/templates`. The creator build copies them into `dist/templates`, making the npm tarball self-contained. A generated project never reads the Zolt repository or a GitHub checkout.

Generated applications use React, TypeScript, Vite, Tailwind, and Fastify. The project-local CLI locates app-local executables using Node module resolution and spawns them without shell syntax. Development runs the API on loopback behind Vite's proxy; production runs the compiled application server. `zolt.config.ts` is loaded through `jiti` before lifecycle commands.

Only implemented packages are published. Database, ORM, provider-specific storage/mail clients, a complete authentication server adapter, UI components, and infrastructure execution integrations remain future work. Authentication, configuration validation, tenant authorization, cryptography, and Postman generation have concrete implementations. Infrastructure templates are emitted only when selected and external tools are never run during creation.

## Packaging and release

Packages expose only built ESM and declarations through explicit `exports`. Release tags (`vX.Y.Z`) trigger trusted npm publishing after the same validation used by CI. Local package validation packs tarballs and installs them into a clean temporary project.

## Consequences

- `npx create-zolt@latest` works from the npm tarball after publication.
- Projects depend on released package versions, not workspace links.
- A small first release is maintainable and its limitations can be stated accurately.
- Database persistence and full authentication/session adapters require later ADRs and implementation.
