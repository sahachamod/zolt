import { run as createProject } from "create-zolt";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadProjectConfig } from "./config.js";
import { doctor } from "./doctor.js";
import { resolveProjectTool, runNodeTool, runNodeTools } from "./process.js";
import { ZOLT_VERSION } from "./version.js";
import { checkEnvironment, initializeEnvironment } from "./environment.js";
import { generatePostman } from "./postman.js";
import { printBanner } from "./ui.js";

const commands = [
  ["dev", "Start the application and frontend development servers"],
  ["build", "Build the application for production"],
  ["start", "Serve the production build"],
  ["test", "Run the application test suite"],
  ["doctor", "Check the local development environment"],
  ["env:init", "Generate local development secrets safely"],
  ["env:check", "Validate authentication, tenant, storage, and email settings"],
  ["postman", "Regenerate an API project's Postman collection"],
  ["list", "List available commands"],
  ["create [name]", "Create a new Zolt application"]
] as const;

function printHelp(): void {
  printBanner();
  console.log(`\nUsage:\n  zolt <command> [options]\n\nCommands:`);
  for (const [name, description] of commands) console.log(`  ${name.padEnd(18)} ${description}`);
  console.log("\nOptions:\n  -h, --help         Show help\n  -v, --version      Show version");
}

export async function runCli(args: string[]): Promise<void> {
  const command = args[0];
  if (!command || command === "help" || command === "--help" || command === "-h") return printHelp();
  if (command === "--version" || command === "-v") return console.log(ZOLT_VERSION);
  if (command === "list") {
    printBanner();
    console.log();
    for (const [name, description] of commands) console.log(`${name.padEnd(18)} ${description}`);
    return;
  }
  if (command === "create") {
    await createProject(args.slice(1));
    return;
  }
  const cwd = process.cwd();
  if (command === "env:init") {
    const changed = await initializeEnvironment(cwd);
    console.log(changed.length ? `Initialized ${changed.join(" and ")} in .env.\nDo not commit this file.` : "Environment secrets are already configured; nothing was overwritten.");
    return;
  }
  if (command === "env:check") {
    const result = checkEnvironment(cwd);
    console.log(`Environment valid.\n\nAuthentication: ${JSON.stringify(result.auth)}\nServices: ${JSON.stringify(result.services)}`);
    return;
  }
  if (command === "postman") {
    console.log(`Postman collection updated:\n  ${await generatePostman(cwd)}`);
    return;
  }
  if (command === "doctor") {
    process.exitCode = doctor(cwd);
    return;
  }
  if (["dev", "build", "test", "start"].includes(command)) {
    const config = await loadProjectConfig(cwd);
    if (command === "start") {
      const serverEntry = path.join(cwd, "dist-server", "server", "index.js");
      if (!existsSync(serverEntry)) throw new Error("No production server build exists. Run `zolt build` first.");
      process.exitCode = await runNodeTool(serverEntry, args.slice(1), cwd, { NODE_ENV: "production" });
      return;
    }
    if (command === "dev") {
      const vite = resolveProjectTool(cwd, "vite", "bin/vite.js");
      const tsx = resolveProjectTool(cwd, "tsx", "dist/cli.mjs");
      const developmentHost = process.env.ZOLT_DEV_HOST ?? "127.0.0.1";
      const developmentEnvironment = { NODE_ENV: "development", HOST: developmentHost, ZOLT_DEV_HOST: developmentHost, ZOLT_API_PORT: String((config.server?.port ?? 3000) + 1) };
      process.exitCode = await runNodeTools([
        { entry: tsx, args: ["watch", "server/index.ts"], env: developmentEnvironment },
        { entry: vite, args: args.slice(1), env: developmentEnvironment }
      ], cwd);
      return;
    }
    if (command === "build") {
      const vite = resolveProjectTool(cwd, "vite", "bin/vite.js");
      const tsc = resolveProjectTool(cwd, "typescript", "lib/tsc.js");
      const frontend = await runNodeTool(vite, ["build", ...args.slice(1)], cwd);
      process.exitCode = frontend || await runNodeTool(tsc, ["-p", "tsconfig.server.json"], cwd);
      return;
    }
    const isTest = command === "test";
    const entry = resolveProjectTool(cwd, "vitest", "vitest.mjs");
    const toolArgs = ["run", ...args.slice(1)];
    process.exitCode = await runNodeTool(entry, toolArgs, cwd);
    return;
  }
  throw new Error(`Unknown command \"${command}\".\n\nRun \`zolt --help\` to see available commands.`);
}
