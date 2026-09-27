import { mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "artifacts");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const name of ["@zolt/core", "@zolt/config", "@zolt/security", "@zolt/auth", "@zolt/database", "@zolt/http", "create-zolt", "@zolt/cli"]) {
  const pnpmEntry = process.env.npm_execpath;
  if (!pnpmEntry) throw new Error("Run this script through pnpm so the package manager entry point is available.");
  const result = spawnSync(process.execPath, [pnpmEntry, "--filter", name, "pack", "--pack-destination", output], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Package tarballs written to ${output}`);
