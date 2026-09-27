import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { materializeTemplate } from "./templates.js";
import type { CreateOptions } from "./types.js";

export function validateProjectName(name: string): void {
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(name) || name.length > 214 || name.startsWith(".") || name.startsWith("_")) {
    throw new Error(`Invalid project name \"${name}\". Use lowercase letters, numbers, dots, hyphens, or underscores.`);
  }
}

export async function directoryHasFiles(destination: string): Promise<boolean> {
  try { return (await readdir(destination)).length > 0; } catch { return false; }
}

function packageManager(): { command: string; args: string[] } {
  const agent = process.env.npm_config_user_agent ?? "";
  if (agent.startsWith("pnpm")) return { command: process.platform === "win32" ? "pnpm.cmd" : "pnpm", args: ["install"] };
  if (agent.startsWith("yarn")) return { command: process.platform === "win32" ? "yarn.cmd" : "yarn", args: [] };
  return { command: process.platform === "win32" ? "npm.cmd" : "npm", args: ["install"] };
}

async function run(command: string, args: string[], cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit", windowsHide: true });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with status ${code ?? 1}.`)));
  });
}

export async function create(destination: string, name: string, options: CreateOptions): Promise<void> {
  await materializeTemplate(destination, name, options);
  if (options.install) {
    const manager = packageManager();
    console.log(`\nInstalling dependencies with ${path.basename(manager.command, path.extname(manager.command))}...`);
    await run(manager.command, manager.args, destination);
  }
  if (options.git) {
    try { await run("git", ["init", "--quiet"], destination); }
    catch { console.warn("\nGit initialization was skipped because Git is unavailable."); }
  }
}
