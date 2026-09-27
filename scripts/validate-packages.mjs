import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const artifacts = path.join(root, "artifacts");
const npmCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");

function command(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", encoding: "utf8", ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed with status ${result.status ?? 1}`);
}

const pnpmEntry = process.env.npm_execpath;
if (!pnpmEntry) throw new Error("Run package validation through pnpm.");
command(process.execPath, [pnpmEntry, "run", "pack"], root);
const tarballs = (await readdir(artifacts)).filter((name) => name.endsWith(".tgz")).map((name) => path.join(artifacts, name));
if (tarballs.length !== 8) throw new Error(`Expected 8 tarballs, found ${tarballs.length}.`);
const core = tarballs.find((name) => name.includes("zolt-framework-core"));
const auth = tarballs.find((name) => name.includes("zolt-framework-auth"));
const config = tarballs.find((name) => name.includes("zolt-framework-config"));
const security = tarballs.find((name) => name.includes("zolt-framework-security"));
const database = tarballs.find((name) => name.includes("zolt-framework-database"));
const http = tarballs.find((name) => name.includes("zolt-framework-http"));
const cli = tarballs.find((name) => name.includes("zolt-framework-cli"));
const creatorTarball = tarballs.find((name) => name.includes("create-zolt"));
if (!core || !auth || !config || !security || !database || !http || !cli || !creatorTarball) throw new Error("A publishable Zolt tarball is missing.");

const temporary = await mkdtemp(path.join(os.tmpdir(), "zolt-package-test-"));
try {
  await writeFile(path.join(temporary, "package.json"), "{\"name\":\"zolt-external-test\",\"private\":true,\"type\":\"module\"}\n");
  command(process.execPath, [npmCli, "install", "--ignore-scripts", core, auth, config, security, database, http, creatorTarball], temporary);
  command(process.execPath, [npmCli, "install", "--ignore-scripts", cli], temporary);
  command(process.execPath, ["--input-type=module", "-e", "import('@zolt-framework/core').then(m=>{if(m.version!=='0.1.0')process.exit(1)})"], temporary);
  command(process.execPath, ["--input-type=module", "-e", "import('@zolt-framework/auth').then(async m=>{const h=await m.hashPassword('package-test-password');if(!await m.verifyPassword(h,'package-test-password'))process.exit(1)})"], temporary);
  command(process.execPath, ["--input-type=module", "-e", "import('@zolt-framework/http').then(m=>{if(typeof m.createZoltServer!=='function')process.exit(1)})"], temporary);
  const zolt = path.join(temporary, "node_modules", "@zolt-framework", "cli", "dist", "bin", "zolt.js");
  const creator = path.join(temporary, "node_modules", "create-zolt", "dist", "bin", "create-zolt.js");
  command(process.execPath, [zolt, "--version"], temporary);
  command(process.execPath, [zolt, "--help"], temporary);
  command(process.execPath, [zolt, "list"], temporary);
  command(process.execPath, [creator, "demo-app", "--yes", "--no-install", "--no-git"], temporary);
  command(process.execPath, [creator, "api-app", "--yes", "--template", "api", "--no-install", "--no-git"], temporary);
  command(process.execPath, [zolt, "postman"], path.join(temporary, "api-app"));
  const apiCollection = JSON.parse(await readFile(path.join(temporary, "api-app", "postman", "api-app.postman_collection.json"), "utf8"));
  if (!String(apiCollection.info?.schema).includes("v2.1.0")) throw new Error("API Postman collection does not use schema 2.1.");
  const projectFile = path.join(temporary, "demo-app", "package.json");
  const project = JSON.parse(await readFile(projectFile, "utf8"));
  project.dependencies["@zolt-framework/core"] = `file:${core.replaceAll("\\", "/")}`;
  project.dependencies["@zolt-framework/auth"] = `file:${auth.replaceAll("\\", "/")}`;
  project.dependencies["@zolt-framework/config"] = `file:${config.replaceAll("\\", "/")}`;
  project.dependencies["@zolt-framework/security"] = `file:${security.replaceAll("\\", "/")}`;
  project.dependencies["@zolt-framework/database"] = `file:${database.replaceAll("\\", "/")}`;
  project.dependencies["@zolt-framework/http"] = `file:${http.replaceAll("\\", "/")}`;
  project.devDependencies["@zolt-framework/cli"] = `file:${cli.replaceAll("\\", "/")}`;
  project.devDependencies["create-zolt"] = `file:${creatorTarball.replaceAll("\\", "/")}`;
  await writeFile(projectFile, `${JSON.stringify(project, null, 2)}\n`);
  command(process.execPath, [npmCli, "install", "--ignore-scripts"], path.dirname(projectFile));
  command(process.execPath, [npmCli, "run", "typecheck"], path.dirname(projectFile));
  command(process.execPath, [npmCli, "test"], path.dirname(projectFile));
  command(process.execPath, [npmCli, "run", "build"], path.dirname(projectFile));
  command(process.execPath, [localCliPath(path.dirname(projectFile)), "env:init"], path.dirname(projectFile));
  command(process.execPath, [localCliPath(path.dirname(projectFile)), "env:check"], path.dirname(projectFile));
  command(process.execPath, [localCliPath(path.dirname(projectFile)), "doctor"], path.dirname(projectFile));

  const localCli = localCliPath(path.dirname(projectFile));
  const dev = spawn(process.execPath, [localCli, "dev"], { cwd: path.dirname(projectFile), stdio: "pipe", windowsHide: true });
  try {
    let response;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      try { response = await fetch("http://127.0.0.1:3000"); break; } catch {}
    }
    if (!response?.ok || !(await response.text()).includes("id=\"root\"")) throw new Error("Development server did not return the generated application.");
    let healthPayload;
    for (let attempt = 0; attempt < 30; attempt++) {
      try {
        const health = await fetch("http://127.0.0.1:3000/api/health");
        if (health.ok) healthPayload = await health.json();
        if (healthPayload?.framework === "zolt") break;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (healthPayload?.framework !== "zolt") throw new Error("Development health endpoint failed.");
    const openapi = await fetch("http://127.0.0.1:3000/openapi.json");
    if (!openapi.ok || (await openapi.json()).openapi !== "3.1.0") throw new Error("Development OpenAPI endpoint failed.");
  } finally { dev.kill("SIGINT"); }
  await new Promise((resolve) => setTimeout(resolve, 500));
  const production = spawn(process.execPath, [localCli, "start"], { cwd: path.dirname(projectFile), stdio: "pipe", windowsHide: true });
  try {
    let response;
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      try { response = await fetch("http://127.0.0.1:3000"); break; } catch {}
    }
    if (!response?.ok || !(await response.text()).includes("id=\"root\"")) throw new Error("Production server did not return the generated application.");
    const health = await fetch("http://127.0.0.1:3000/api/health");
    if (!health.ok || (await health.json()).framework !== "zolt") throw new Error("Production health endpoint failed.");
    const openapi = await fetch("http://127.0.0.1:3000/openapi.json");
    if (!openapi.ok || (await openapi.json()).openapi !== "3.1.0") throw new Error("Production OpenAPI endpoint failed.");
  } finally { production.kill("SIGINT"); }
  console.log("External package and generated-application validation passed.");
} finally {
  await rm(temporary, { recursive: true, force: true, maxRetries: 3 });
}

function localCliPath(projectDirectory) {
  return path.join(projectDirectory, "node_modules", "@zolt-framework", "cli", "dist", "bin", "zolt.js");
}
