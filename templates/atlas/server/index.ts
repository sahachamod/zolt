import { createZoltServer } from "@zolt/http";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import config from "../zolt.config.js";
import { getDatabase } from "../database/client.js";

try { process.loadEnvFile(path.resolve(".env")); } catch {}

export async function buildApplication() {
  return createZoltServer({
    name: config.app.name,
    version: "0.1.0",
    staticRoot: process.env.NODE_ENV === "production" && existsSync(path.resolve("dist")) ? path.resolve("dist") : undefined,
    database: config.database?.driver !== "none" ? await getDatabase() : undefined
  });
}

export async function startApplication(): Promise<void> {
  const app = await buildApplication();
  const host = process.env.HOST ?? config.server?.host ?? "0.0.0.0";
  const port = Number(process.env.ZOLT_API_PORT ?? process.env.PORT ?? config.server?.port ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be an integer between 1 and 65535.");
  const close = async () => { await app.close(); process.exit(0); };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
  await app.listen({ host, port });
}

const invokedAsScript = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedAsScript) await startApplication();
