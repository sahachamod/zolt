import { access } from "node:fs/promises";
import path from "node:path";
import { createJiti } from "jiti";
import { loadEnvFile } from "node:process";

export interface LoadedConfig {
  app: { name: string };
  server?: { host?: string; port?: number };
  frontend?: { tsx?: boolean; tailwind?: boolean };
}

export async function loadProjectConfig(cwd: string): Promise<LoadedConfig> {
  const filename = path.join(cwd, "zolt.config.ts");
  try { loadEnvFile(path.join(cwd, ".env")); } catch {}
  try {
    await access(filename);
  } catch {
    throw new Error(`No zolt.config.ts was found in:\n  ${cwd}\n\nRun this command from a Zolt project.`);
  }

  try {
    const jiti = createJiti(import.meta.url, { interopDefault: true });
    const loaded = await jiti.import(filename, { default: true }) as LoadedConfig;
    if (!loaded?.app?.name) throw new Error("config.app.name is required");
    return loaded;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to load zolt.config.ts.\n\nReason:\n  ${reason}`);
  }
}
