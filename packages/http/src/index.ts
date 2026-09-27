import fastifyStatic from "@fastify/static";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import { authorizeTenant, type AuthenticatedPrincipal } from "@zolt/auth";
import type { DatabaseClient } from "@zolt/database";
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type FastifyServerOptions
} from "fastify";
import { randomUUID } from "node:crypto";
import path from "node:path";

declare module "fastify" {
  interface FastifyInstance {
    db: DatabaseClient;
  }
}

export interface ZoltServerOptions {
  name: string;
  version?: string;
  logger?: FastifyServerOptions["logger"];
  bodyLimit?: number;
  trustProxy?: FastifyServerOptions["trustProxy"];
  rateLimit?: { max?: number; timeWindow?: string | number } | false;
  staticRoot?: string;
  authenticate?: (request: FastifyRequest) => Promise<AuthenticatedPrincipal | null>;
  database?: DatabaseClient;
}

export interface TenantContext {
  principal: AuthenticatedPrincipal;
  tenantId: string;
}

export interface TenantRouteOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  schema?: Record<string, unknown>;
  handler: (request: FastifyRequest, reply: FastifyReply, context: TenantContext) => unknown | Promise<unknown>;
}

const redactedPaths = [
  "req.headers.authorization", "req.headers.cookie", "req.headers.x-api-key",
  "res.headers.set-cookie", "password", "token", "secret"
];

export async function createZoltServer(options: ZoltServerOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? { level: process.env.LOG_LEVEL ?? "info", redact: redactedPaths },
    bodyLimit: options.bodyLimit ?? 1_048_576,
    trustProxy: options.trustProxy ?? false,
    requestIdHeader: false,
    genReqId: () => randomUUID()
  });

  if (options.database) {
    const database = options.database;
    app.decorate<DatabaseClient>("db", database);
    app.addHook("onClose", async () => {
      await database.close();
    });
  }

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        imgSrc: ["'self'", "data:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"]
      }
    },
    referrerPolicy: { policy: "no-referrer" }
  });
  if (options.rateLimit !== false) {
    await app.register(rateLimit, {
      global: true,
      max: options.rateLimit?.max ?? 100,
      timeWindow: options.rateLimit?.timeWindow ?? "1 minute"
    });
  }
  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: { title: `${options.name} API`, version: options.version ?? "0.1.0" },
      components: {
        securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } }
      }
    }
  });

  app.get("/api/health", {
    schema: {
      tags: ["system"],
      response: { 200: { type: "object", required: ["status", "framework", "requestId"], properties: {
        status: { type: "string" }, framework: { type: "string" }, requestId: { type: "string" }
      } } }
    }
  }, async (request) => ({ status: "ok", framework: "zolt", requestId: request.id }));

  app.get("/openapi.json", { schema: { hide: true } }, async () => app.swagger());

  app.setErrorHandler((error, request, reply) => {
    const failure = error instanceof Error ? error : new Error("Unknown server error");
    const candidate = "statusCode" in failure && typeof failure.statusCode === "number" ? failure.statusCode : 500;
    const statusCode = candidate >= 400 && candidate < 600 ? candidate : 500;
    if (statusCode >= 500) request.log.error({ err: failure }, "request failed");
    void reply.code(statusCode).send({
      error: statusCode >= 500 ? "Internal Server Error" : failure.name,
      message: statusCode >= 500 ? "The request could not be completed." : failure.message,
      statusCode,
      requestId: request.id
    });
  });

  if (options.staticRoot) {
    const root = path.resolve(options.staticRoot);
    await app.register(fastifyStatic, {
      root,
      wildcard: false,
      index: false,
      setHeaders(response, filename) {
        response.header("Cache-Control", path.basename(filename) === "index.html" ? "no-store" : "public, max-age=31536000, immutable");
      }
    });
    app.get("/", { schema: { hide: true } }, async (_request, reply) => reply.sendFile("index.html"));
    app.setNotFoundHandler(async (request, reply) => {
      if (request.method === "GET" && request.headers.accept?.includes("text/html")) return reply.sendFile("index.html");
      return reply.code(404).send({ error: "Not Found", message: "The requested resource does not exist.", statusCode: 404, requestId: request.id });
    });
  }
  return app;
}

export function registerTenantRoute(app: FastifyInstance, options: TenantRouteOptions, authenticate: ZoltServerOptions["authenticate"]): void {
  app.route({
    method: options.method,
    url: options.url,
    schema: options.schema,
    handler: async (request, reply) => {
      if (!authenticate) return reply.code(500).send({ error: "AuthenticationNotConfigured", message: "Authentication is not configured.", statusCode: 500, requestId: request.id });
      const principal = await authenticate(request);
      if (!principal) return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required.", statusCode: 401, requestId: request.id });
      const selected = request.headers["x-tenant-id"];
      const tenantId = Array.isArray(selected) ? selected[0] : selected;
      if (!tenantId) return reply.code(400).send({ error: "TenantRequired", message: "A verified tenant selection is required.", statusCode: 400, requestId: request.id });
      try {
        authorizeTenant(principal, tenantId);
      } catch {
        return reply.code(403).send({ error: "Forbidden", message: "The authenticated principal cannot access this tenant.", statusCode: 403, requestId: request.id });
      }
      return options.handler(request, reply, { principal, tenantId });
    }
  });
}
