import path from "node:path";
import { parseArgs } from "./args.js";
import { create, directoryHasFiles, validateProjectName } from "./create.js";
import { Prompter } from "./prompts.js";

const choices = {
  template: [{ value: "atlas", label: "Atlas" }, { value: "api", label: "API" }, { value: "ssr", label: "SSR" }, { value: "minimal", label: "Minimal" }] as const,
  database: [{ value: "postgres", label: "PostgreSQL" }, { value: "mysql", label: "MySQL" }, { value: "sqlite", label: "SQLite" }, { value: "mongodb", label: "MongoDB" }, { value: "none", label: "None" }] as const,
  auth: [{ value: "local", label: "Local accounts (Argon2id)" }, { value: "asgardeo", label: "WSO2 Asgardeo" }, { value: "keycloak", label: "Keycloak" }, { value: "oidc", label: "Custom OpenID Connect" }, { value: "none", label: "None" }] as const,
  ui: [{ value: "zolt", label: "Zolt theme + Tailwind" }, { value: "tailwind", label: "Tailwind only" }, { value: "none", label: "None" }] as const,
  infra: [{ value: "docker", label: "Docker" }, { value: "docker-kubernetes", label: "Docker + Kubernetes" }, { value: "terraform-ansible", label: "Terraform + Ansible" }, { value: "full", label: "Full" }, { value: "none", label: "None" }] as const,
  testing: [{ value: "full", label: "Full" }, { value: "basic", label: "Basic" }, { value: "none", label: "None" }] as const
  ,storage: [{ value: "none", label: "None" }, { value: "local", label: "Local filesystem" }, { value: "s3", label: "Amazon S3 compatible" }, { value: "gcs", label: "Google Cloud Storage" }, { value: "azure", label: "Azure Blob Storage" }] as const
  ,mail: [{ value: "none", label: "None" }, { value: "smtp", label: "SMTP" }, { value: "ses", label: "Amazon SES" }, { value: "sendgrid", label: "SendGrid" }, { value: "mailgun", label: "Mailgun" }] as const
};

export function help(): void {
  console.log(`create-zolt 0.1.0\n\nUsage:\n  npx create-zolt [destination] [options]\n\nOptions:\n  --template <atlas|api|ssr|minimal>\n  --database <postgres|mysql|sqlite|mongodb|none>\n  --auth <local|asgardeo|keycloak|oidc|none>\n  --storage <none|local|s3|gcs|azure>\n  --mail <none|smtp|ses|sendgrid|mailgun>\n  --ui <zolt|tailwind|none>\n  --infra <docker|docker-kubernetes|terraform-ansible|full|none>\n  --testing <full|basic|none>\n  --git | --no-git\n  --install | --no-install\n  --force\n  -y, --yes\n  -h, --help`);
}

export async function run(args: string[]): Promise<void> {
  let options;
  try { options = parseArgs(args); }
  catch (error) {
    if (error instanceof Error && error.message === "__HELP__") return help();
    throw error;
  }
  console.log("\n╭──────────────────────────────────────────╮\n│  ◆ ZOLT                                  │\n│  Tenant-first TypeScript applications    │\n│  Secure defaults · Flexible architecture │\n╰──────────────────────────────────────────╯\n");
  const prompt = new Prompter();
  try {
    if (!options.projectArg) options.projectArg = options.yes ? "my-zolt-app" : await prompt.text("Project name", "my-zolt-app");
    if (!options.yes) {
      options.template = await prompt.select("Application", choices.template, options.template);
      options.database = await prompt.select("Database", choices.database, options.database);
      options.auth = await prompt.select("Authentication", choices.auth, options.auth);
      options.storage = await prompt.select("Object storage", choices.storage, options.storage);
      options.mail = await prompt.select("Email delivery", choices.mail, options.mail);
      options.ui = await prompt.select("UI", choices.ui, options.ui);
      options.infra = await prompt.select("Infrastructure", choices.infra, options.infra);
      options.testing = await prompt.select("Testing", choices.testing, options.testing);
      options.git = await prompt.confirm("Initialize Git?", options.git);
      console.log(`\nProject plan\n  Application: ${options.template}\n  Authentication: ${options.auth}\n  Database: ${options.database}\n  Storage: ${options.storage}\n  Email: ${options.mail}\n  Infrastructure: ${options.infra}\n  Testing: ${options.testing}`);
      if (!await prompt.confirm("Create this project?", true)) throw new Error("Project creation cancelled.");
    }
    const destination = path.resolve(process.cwd(), options.projectArg);
    const name = options.projectArg === "." ? path.basename(destination) : path.basename(options.projectArg);
    validateProjectName(name);
    if (await directoryHasFiles(destination) && !options.force) {
      if (options.yes || !process.stdin.isTTY) throw new Error(`Destination is not empty:\n  ${destination}\n\nUse --force to explicitly allow overwriting conflicting files.`);
      const confirmed = await prompt.confirm("The destination is not empty. Continue without deleting existing files?", false);
      if (!confirmed) throw new Error("Project creation cancelled.");
      options.force = true;
    }
    await create(destination, name, options);
    const relative = path.relative(process.cwd(), destination) || ".";
    console.log(`\nCreated ${name} successfully.\n\nNext steps:\n  cd ${relative}\n  ${options.install ? "" : "npm install\n  "}zolt dev\n\nIf your shell does not resolve local binaries, use: npx zolt dev\nOpen http://localhost:3000`);
  } finally { prompt.close(); }
}

export { parseArgs } from "./args.js";
export { validateProjectName } from "./create.js";
