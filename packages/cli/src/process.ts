import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

function packageRoot(entry: string): string {
  const marker = `${path.sep}node_modules${path.sep}`;
  const markerIndex = entry.lastIndexOf(marker);
  if (markerIndex < 0) return path.dirname(entry);
  const after = entry.slice(markerIndex + marker.length).split(path.sep);
  const packageParts = after[0]?.startsWith("@") ? 2 : 1;
  return path.join(entry.slice(0, markerIndex + marker.length), ...after.slice(0, packageParts));
}

export function resolveProjectTool(cwd: string, packageName: string, relativeBin: string): string {
  try {
    const require = createRequire(path.join(cwd, "package.json"));
    const entry = require.resolve(packageName);
    return path.join(packageRoot(entry), relativeBin);
  } catch {
    throw new Error(`The project dependency \"${packageName}\" is not installed.\n\nRun your package manager install command and try again.`);
  }
}

export async function runNodeTool(entry: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv): Promise<number> {
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entry, ...args], { cwd, stdio: "inherit", env: { ...process.env, ...env } });
    const interrupt = () => child.kill("SIGINT");
    process.once("SIGINT", interrupt);
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      process.off("SIGINT", interrupt);
      resolve(signal === "SIGINT" ? 130 : (code ?? 1));
    });
  });
}

export async function runNodeTools(tools: Array<{ entry: string; args: string[]; env?: NodeJS.ProcessEnv }>, cwd: string): Promise<number> {
  return await new Promise((resolve, reject) => {
    const children = tools.map((tool) => spawn(process.execPath, [tool.entry, ...tool.args], {
      cwd, stdio: "inherit", windowsHide: true, env: { ...process.env, ...tool.env }
    }));
    let settled = false;
    const stop = (signal: NodeJS.Signals = "SIGINT") => {
      for (const child of children) if (!child.killed) child.kill(signal);
    };
    const interrupt = () => stop("SIGINT");
    process.once("SIGINT", interrupt);
    process.once("SIGTERM", interrupt);
    for (const child of children) {
      child.once("error", (error) => {
        if (settled) return;
        settled = true; stop(); reject(error);
      });
      child.once("exit", (code, signal) => {
        if (settled) return;
        settled = true; stop();
        process.off("SIGINT", interrupt); process.off("SIGTERM", interrupt);
        resolve(signal === "SIGINT" ? 130 : (code ?? 1));
      });
    }
  });
}
