# CLI

`zolt dev` loads `zolt.config.ts`, starts the generated Fastify application on a loopback API port, and starts Vite with an API proxy. `build` compiles both the browser and server, `start` runs the generated production server with graceful SIGINT/SIGTERM shutdown, and `test` runs app-local Vitest. `doctor` checks required and optional tools without claiming missing optional tools are errors. `list`, `--help`, and `--version` are side-effect free.

`zolt env:init` fills only blank local pepper and encryption-key entries and never overwrites existing values. `zolt env:check` validates authentication, tenant, storage, mail, and cryptography settings without printing secrets. API projects use `zolt postman` to regenerate a Postman 2.1 collection from `routes/manifest.json`.

Database and infrastructure execution commands are not part of 0.1. Use the native tools directly for generated infrastructure.
