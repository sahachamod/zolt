import { cp, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CreateOptions } from "./types.js";
import { createPostmanCollection, type RouteManifest } from "@zolt/core";

const templateRoot = fileURLToPath(new URL("./templates", import.meta.url));

const databaseDrivers: Record<string, string> = {
  postgres: "postgres", mysql: "mysql", sqlite: "sqlite", mongodb: "mongodb", none: "none"
};

const databaseDriverPackages: Record<string, string | undefined> = {
  postgres: "pg", mysql: "mysql2", mongodb: "mongodb", sqlite: undefined, none: undefined
};

const databaseDriverVersions: Record<string, string> = {
  pg: "^8.13.0", mysql2: "^3.11.0", mongodb: "^6.10.0"
};

async function removeIfPresent(filename: string): Promise<void> {
  await rm(filename, { recursive: true, force: true });
}

async function generateInfrastructure(destination: string, infra: string): Promise<void> {
  const wantsDocker = ["docker", "docker-kubernetes", "full"].includes(infra);
  const wantsKubernetes = ["docker-kubernetes", "full"].includes(infra);
  const wantsAutomation = ["terraform-ansible", "full"].includes(infra);
  if (!wantsDocker) {
    for (const name of ["Dockerfile", "Dockerfile.dev", ".dockerignore", "docker-compose.yml"]) await removeIfPresent(path.join(destination, name));
  }
  if (!wantsKubernetes) await removeIfPresent(path.join(destination, "infra", "kubernetes"));
  if (!wantsAutomation) {
    await removeIfPresent(path.join(destination, "infra", "terraform"));
    await removeIfPresent(path.join(destination, "infra", "ansible"));
  }
  if (infra === "none") await removeIfPresent(path.join(destination, "infra"));
}

export async function materializeTemplate(destination: string, name: string, options: CreateOptions): Promise<void> {
  const base = path.join(templateRoot, "atlas");
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(base)) {
    await cp(path.join(base, entry), path.join(destination, entry), { recursive: true, force: options.force, errorOnExist: !options.force });
  }
  if (options.template !== "atlas") {
    const overlay = path.join(templateRoot, options.template);
    for (const entry of await readdir(overlay)) {
      await cp(path.join(overlay, entry), path.join(destination, entry), { recursive: true, force: true });
    }
  }
  await rename(path.join(destination, "_gitignore"), path.join(destination, ".gitignore"));
  const packageTemplate = JSON.parse(await readFile(path.join(destination, "package.template.json"), "utf8")) as Record<string, unknown>;
  packageTemplate.name = name;
  if (options.auth === "none") {
    const dependencies = packageTemplate.dependencies as Record<string, string>;
    delete dependencies["@zolt/auth"];
    await removeIfPresent(path.join(destination, "server", "auth.ts"));
  }
  if (options.testing === "none") {
    const dev = packageTemplate.devDependencies as Record<string, string>;
    delete dev.vitest;
    (packageTemplate.scripts as Record<string, string>).test = "echo \"No test runner configured\"";
    await removeIfPresent(path.join(destination, "tests"));
  }
  const driverPackage = databaseDriverPackages[options.database];
  if (driverPackage) {
    const dependencies = packageTemplate.dependencies as Record<string, string>;
    dependencies[driverPackage] = databaseDriverVersions[driverPackage];
  }
  if (options.ui === "none") {
    const dev = packageTemplate.devDependencies as Record<string, string>;
    delete dev.tailwindcss; delete dev.autoprefixer; delete dev.postcss;
    delete dev["@tailwindcss/forms"]; delete dev["@tailwindcss/typography"];
    await removeIfPresent(path.join(destination, "tailwind.config.ts"));
    await removeIfPresent(path.join(destination, "postcss.config.js"));
    await writeFile(path.join(destination, "resources/styles/app.css"), "body { margin: 0; font-family: system-ui, sans-serif; }\n", "utf8");
  }
  await writeFile(path.join(destination, "package.json"), `${JSON.stringify(packageTemplate, null, 2)}\n`, "utf8");
  await removeIfPresent(path.join(destination, "package.template.json"));
  const replacements = new Map([
    ["__PROJECT_NAME__", name], ["__DATABASE_DRIVER__", databaseDrivers[options.database]],
    ["__TAILWIND__", String(options.ui !== "none")], ["__AUTH_PROVIDER__", options.auth],
    ["__STORAGE_PROVIDER__", options.storage], ["__MAIL_PROVIDER__", options.mail]
  ]);
  for (const relative of ["zolt.config.ts", ".env.example", "README.md", "index.html"]) {
    const filename = path.join(destination, relative);
    let contents = await readFile(filename, "utf8");
    for (const [from, to] of replacements) contents = contents.replaceAll(from, to);
    await writeFile(filename, contents, "utf8");
  }
  await cp(path.join(destination, ".env.example"), path.join(destination, ".env"), { force: options.force });
  await generateInfrastructure(destination, options.infra);
  await writeFile(path.join(destination, "zolt.project.json"), `${JSON.stringify({ template: options.template, database: options.database, auth: options.auth, storage: options.storage, mail: options.mail, ui: options.ui, infrastructure: options.infra, testing: options.testing }, null, 2)}\n`, "utf8");
  if (options.template === "api") {
    const manifest = JSON.parse(await readFile(path.join(destination, "routes", "manifest.json"), "utf8")) as RouteManifest;
    await mkdir(path.join(destination, "postman"), { recursive: true });
    await writeFile(path.join(destination, "postman", `${name}.postman_collection.json`), `${JSON.stringify(createPostmanCollection(name, manifest), null, 2)}\n`, "utf8");
  }
}
