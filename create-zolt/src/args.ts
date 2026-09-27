import type { Auth, CreateOptions, Database, Infra, Mail, Storage, Template, Testing, Ui } from "./types.js";

const values = {
  template: ["atlas", "api", "ssr", "minimal"],
  database: ["postgres", "mysql", "sqlite", "mongodb", "none"],
  auth: ["local", "asgardeo", "keycloak", "oidc", "none"],
  ui: ["zolt", "tailwind", "none"],
  infra: ["docker", "docker-kubernetes", "terraform-ansible", "full", "none"],
  testing: ["full", "basic", "none"],
  storage: ["none", "local", "s3", "gcs", "azure"],
  mail: ["none", "smtp", "ses", "sendgrid", "mailgun"]
} as const;

function optionValue(args: string[], index: number, name: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("-")) throw new Error(`Option --${name} requires a value.`);
  return value;
}

export function parseArgs(args: string[]): CreateOptions {
  const options: CreateOptions = {
    template: "atlas", database: "none", auth: "local", ui: "zolt", infra: "none",
    testing: "full", storage: "none", mail: "none", git: true, install: true, force: false, yes: false
  };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!arg.startsWith("-")) {
      if (options.projectArg) throw new Error("Only one project destination may be provided.");
      options.projectArg = arg;
      continue;
    }
    if (arg === "--yes" || arg === "-y") options.yes = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--git") options.git = true;
    else if (arg === "--no-git") options.git = false;
    else if (arg === "--install") options.install = true;
    else if (arg === "--no-install") options.install = false;
    else if (arg === "--help" || arg === "-h") throw new Error("__HELP__");
    else if (arg.startsWith("--")) {
      const key = arg.slice(2) as keyof typeof values;
      if (!(key in values)) throw new Error(`Unknown option ${arg}.`);
      const value = optionValue(args, index, key);
      index++;
      if (!(values[key] as readonly string[]).includes(value)) {
        throw new Error(`Invalid --${key} value \"${value}\". Choose: ${values[key].join(", ")}.`);
      }
      (options as unknown as Record<string, string>)[key] = value;
    } else throw new Error(`Unknown option ${arg}.`);
  }
  return options as CreateOptions & { template: Template; database: Database; auth: Auth; ui: Ui; infra: Infra; testing: Testing; storage: Storage; mail: Mail };
}
