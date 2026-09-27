export type StorageProvider = "none" | "local" | "s3" | "gcs" | "azure";
export type MailProvider = "none" | "smtp" | "ses" | "sendgrid" | "mailgun";
export type DatabaseDriver = "postgres" | "mysql" | "sqlite" | "mongodb" | "none";
export type Environment = Record<string, string | undefined>;

export interface ServiceConfig {
  tenant: { defaultId: string };
  storage: { provider: StorageProvider; bucket?: string; region?: string; endpoint?: string; localPath?: string };
  mail: { provider: MailProvider; from?: string; host?: string; port?: number; secure?: boolean; region?: string };
  database: { driver: DatabaseDriver; url?: string; pool?: { max?: number; idleTimeoutMillis?: number; connectionTimeoutMillis?: number } };
  cryptography: { keyId: string; configured: boolean };
}

const tenantPattern = /^[a-z0-9][a-z0-9_-]{1,63}$/;

function choice<T extends string>(value: string | undefined, fallback: T, values: readonly T[], name: string): T {
  const selected = (value?.trim().toLowerCase() || fallback) as T;
  if (!values.includes(selected)) throw new Error(`${name} must be one of: ${values.join(", ")}.`);
  return selected;
}

function required(env: Environment, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the selected provider.`);
  return value;
}

export function loadServiceConfig(env: Environment = process.env): ServiceConfig {
  const defaultId = (env.DEFAULT_TENANT_ID ?? "default").trim().toLowerCase();
  if (!tenantPattern.test(defaultId)) throw new Error("DEFAULT_TENANT_ID must be 2-64 lowercase letters, numbers, underscores, or hyphens.");
  const storage = choice(env.STORAGE_PROVIDER, "none", ["none", "local", "s3", "gcs", "azure"] as const, "STORAGE_PROVIDER");
  const mail = choice(env.MAIL_PROVIDER, "none", ["none", "smtp", "ses", "sendgrid", "mailgun"] as const, "MAIL_PROVIDER");
  const database = choice(env.DATABASE_DRIVER, "none", ["none", "postgres", "mysql", "sqlite", "mongodb"] as const, "DATABASE_DRIVER");
  const storageConfig: ServiceConfig["storage"] = { provider: storage };
  if (storage === "local") storageConfig.localPath = env.STORAGE_LOCAL_PATH?.trim() || "./storage";
  if (["s3", "gcs", "azure"].includes(storage)) storageConfig.bucket = required(env, "STORAGE_BUCKET");
  if (storage === "s3") storageConfig.region = required(env, "STORAGE_REGION");
  if (env.STORAGE_ENDPOINT?.trim()) storageConfig.endpoint = new URL(env.STORAGE_ENDPOINT).toString();
  const mailConfig: ServiceConfig["mail"] = { provider: mail };
  if (mail !== "none") mailConfig.from = required(env, "MAIL_FROM");
  if (mail === "smtp") {
    mailConfig.host = required(env, "SMTP_HOST");
    mailConfig.port = Number(env.SMTP_PORT ?? "587");
    if (!Number.isInteger(mailConfig.port) || mailConfig.port < 1 || mailConfig.port > 65_535) throw new Error("SMTP_PORT must be a valid TCP port.");
    mailConfig.secure = (env.SMTP_SECURE ?? "false").toLowerCase() === "true";
  }
  if (mail === "ses") mailConfig.region = required(env, "MAIL_REGION");
  if (mail === "sendgrid" || mail === "mailgun") required(env, "MAIL_API_KEY");
  const databaseConfig: ServiceConfig["database"] = { driver: database };
  if (database !== "none") {
    databaseConfig.url = required(env, "DATABASE_URL");
    const pool: NonNullable<ServiceConfig["database"]["pool"]> = {};
    if (env.DATABASE_POOL_MAX?.trim()) {
      const max = Number(env.DATABASE_POOL_MAX);
      if (!Number.isInteger(max) || max < 1) throw new Error("DATABASE_POOL_MAX must be a positive integer.");
      pool.max = max;
    }
    if (env.DATABASE_POOL_IDLE_TIMEOUT_MS?.trim()) {
      const idleTimeoutMillis = Number(env.DATABASE_POOL_IDLE_TIMEOUT_MS);
      if (!Number.isInteger(idleTimeoutMillis) || idleTimeoutMillis < 0) throw new Error("DATABASE_POOL_IDLE_TIMEOUT_MS must be a non-negative integer.");
      pool.idleTimeoutMillis = idleTimeoutMillis;
    }
    if (env.DATABASE_POOL_CONNECTION_TIMEOUT_MS?.trim()) {
      const connectionTimeoutMillis = Number(env.DATABASE_POOL_CONNECTION_TIMEOUT_MS);
      if (!Number.isInteger(connectionTimeoutMillis) || connectionTimeoutMillis < 0) throw new Error("DATABASE_POOL_CONNECTION_TIMEOUT_MS must be a non-negative integer.");
      pool.connectionTimeoutMillis = connectionTimeoutMillis;
    }
    if (Object.keys(pool).length > 0) databaseConfig.pool = pool;
  }
  return {
    tenant: { defaultId }, storage: storageConfig, mail: mailConfig, database: databaseConfig,
    cryptography: { keyId: env.CRYPTO_KEY_ID?.trim() || "development", configured: Boolean(env.CRYPTO_MASTER_KEY?.trim()) }
  };
}

export function serviceConfigSummary(config: ServiceConfig): Record<string, unknown> {
  return { tenant: config.tenant.defaultId, storage: config.storage.provider, mail: config.mail.provider, database: config.database.driver, cryptography: config.cryptography.configured ? `configured (${config.cryptography.keyId})` : "not configured" };
}
