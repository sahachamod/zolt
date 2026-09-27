# @zolt/http

The production HTTP runtime for Zolt. It provides Fastify 5, secure headers, request IDs, JSON-schema validation, OpenAPI 3.1 generation, rate limiting, static application serving, and tenant-authorized route helpers.

```ts
import { createZoltServer } from "@zolt/http";

const app = await createZoltServer({ name: "example" });
await app.listen({ host: "127.0.0.1", port: 3000 });
```

`trustProxy` is disabled by default. Enable it only when the exact reverse-proxy topology is trusted. The default rate-limit store is process-local; multi-instance deployments should configure rate limiting at a trusted gateway or use a shared store.
