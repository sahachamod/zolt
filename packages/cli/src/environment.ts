import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { authConfigFromEnv, publicAuthConfig } from "@zolt/auth";
import { loadServiceConfig, serviceConfigSummary } from "@zolt/config";
import { generateEncryptionKey, randomToken } from "@zolt/security";

function replaceBlank(contents: string, name: string, value: string): { contents: string; changed: boolean } {
  const pattern = new RegExp(`^${name}=\\s*$`, "m");
  return pattern.test(contents) ? { contents: contents.replace(pattern, `${name}=${value}`), changed: true } : { contents, changed: false };
}

export async function initializeEnvironment(cwd: string): Promise<string[]> {
  const filename = path.join(cwd, ".env");
  let contents: string;
  try { contents = await readFile(filename, "utf8"); }
  catch { throw new Error("No .env file exists. Create the project environment from .env.example first."); }
  const changed: string[] = [];
  for (const [name, value] of [["AUTH_PASSWORD_PEPPER", randomToken(48)], ["CRYPTO_MASTER_KEY", generateEncryptionKey()]] as const) {
    const result = replaceBlank(contents, name, value);
    contents = result.contents;
    if (result.changed) changed.push(name);
  }
  if (changed.length) await writeFile(filename, contents, { encoding: "utf8", mode: 0o600 });
  return changed;
}

export function checkEnvironment(cwd: string): { auth: Record<string, unknown>; services: Record<string, unknown> } {
  try { loadEnvFile(path.join(cwd, ".env")); } catch { throw new Error("Unable to load .env. Copy .env.example to .env first."); }
  const auth = authConfigFromEnv();
  const services = loadServiceConfig();
  if (auth.provider === "local" && !auth.pepper) throw new Error("AUTH_PASSWORD_PEPPER is missing. Run `zolt env:init`.");
  if (!services.cryptography.configured) throw new Error("CRYPTO_MASTER_KEY is missing. Run `zolt env:init`.");
  return { auth: publicAuthConfig(auth), services: serviceConfigSummary(services) };
}
