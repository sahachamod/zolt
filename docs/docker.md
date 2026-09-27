# Docker

Select `--infra docker` to generate development Compose, a development image, and a multi-stage production image. The runtime uses a non-root user, production `NODE_ENV`, a healthcheck, and the CLI's graceful shutdown. No secrets are copied intentionally; `.dockerignore` excludes `.env`.
