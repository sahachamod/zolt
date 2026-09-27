import { spawnSync } from "node:child_process";
import { accessSync, constants, readFileSync } from "node:fs";
import path from "node:path";
import { ZOLT_VERSION } from "./version.js";

interface Check { label: string; required: boolean; ok: boolean; detail?: string }

function executable(command: string, args = ["--version"]): { ok: boolean; detail?: string } {
  const executableName = process.platform === "win32" && ["pnpm", "npm", "npx"].includes(command) ? `${command}.cmd` : command;
  const result = spawnSync(executableName, args, { encoding: "utf8", windowsHide: true });
  const detail = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim().split(/\r?\n/)[0];
  return { ok: result.status === 0, detail: result.status === 0 ? detail : undefined };
}

export function doctor(cwd: string): number {
  let config = false;
  let environment = false;
  try { accessSync(path.join(cwd, "zolt.config.ts"), constants.R_OK); config = true; } catch {}
  try { accessSync(path.join(cwd, ".env"), constants.R_OK); environment = true; } catch {}
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  let typescriptVersion: string | undefined;
  let database = "not configured";
  let authentication = "not configured";
  let storage = "not configured";
  let mail = "not configured";
  try {
    const manifest = JSON.parse(readFileSync(path.join(cwd, "node_modules", "typescript", "package.json"), "utf8")) as { version?: string };
    typescriptVersion = manifest.version;
  } catch {}
  try {
    const project = JSON.parse(readFileSync(path.join(cwd, "zolt.project.json"), "utf8")) as { database?: string; auth?: string; storage?: string; mail?: string };
    database = project.database ?? database;
    authentication = project.auth ?? authentication;
    storage = project.storage ?? storage;
    mail = project.mail ?? mail;
  } catch {}
  const checks: Check[] = [
    { label: "Node.js", required: true, ok: nodeMajor >= 22, detail: process.version },
    { label: "Zolt", required: true, ok: true, detail: ZOLT_VERSION },
    { label: "TypeScript", required: true, ok: Boolean(typescriptVersion), detail: typescriptVersion },
    { label: "configuration", required: true, ok: config },
    { label: "environment (.env)", required: false, ok: environment },
    { label: "database", required: false, ok: database !== "none" && database !== "not configured", detail: database },
    { label: "authentication", required: false, ok: authentication !== "none" && authentication !== "not configured", detail: authentication },
    { label: "object storage", required: false, ok: storage !== "none" && storage !== "not configured", detail: storage },
    { label: "email delivery", required: false, ok: mail !== "none" && mail !== "not configured", detail: mail },
    ...[
      ["pnpm", false], ["Git", false, "git"], ["Docker", false, "docker"],
      ["Terraform", false, "terraform"], ["Ansible", false, "ansible"], ["kubectl", false, "kubectl"]
    ].map(([label, required, command]) => {
      const result = executable(String(command ?? String(label).toLowerCase()));
      return { label: String(label), required: Boolean(required), ...result };
    })
  ];

  console.log("Zolt Doctor\n");
  for (const check of checks) {
    const symbol = check.ok ? "✓" : check.required ? "✗" : "○";
    const suffix = check.detail ? ` (${check.detail})` : check.ok ? "" : " not installed or unavailable";
    console.log(`${symbol} ${check.label}${suffix}`);
  }
  const failed = checks.some((check) => check.required && !check.ok);
  console.log(failed ? "\nRequired checks failed." : "\nReady for Zolt development.");
  return failed ? 1 : 0;
}
