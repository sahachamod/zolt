# Deployment

Run `zolt build`, deploy `dist`, `dist-server`, the production dependencies, and configuration, then run `zolt start`. The generated Fastify server owns API routes, OpenAPI, hardened static delivery, and graceful shutdown. Keep `trustProxy` disabled unless the exact proxy topology is trusted. Terminate TLS and provide process supervision at the platform layer; use a shared or gateway rate limiter for multi-instance deployments.
