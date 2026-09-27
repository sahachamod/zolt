export type DatabaseDriver = "postgres" | "mysql" | "sqlite" | "mongodb" | "none";

export interface ZoltConfig {
  app: {
    name: string;
    environment?: "development" | "test" | "production";
  };
  server?: {
    host?: string;
    port?: number;
  };
  database?: {
    driver?: DatabaseDriver;
    url?: string;
  };
  authentication?: {
    provider?: "local" | "asgardeo" | "keycloak" | "oidc" | "none";
    tenantRequired?: boolean;
  };
  services?: {
    storage?: "none" | "local" | "s3" | "gcs" | "azure";
    mail?: "none" | "smtp" | "ses" | "sendgrid" | "mailgun";
  };
  frontend?: {
    tsx?: boolean;
    tailwind?: boolean;
  };
}

export function defineConfig(config: ZoltConfig): ZoltConfig {
  return config;
}

export const version = "0.1.0";
export { createPostmanCollection } from "./postman.js";
export type { ApiRoute, RouteManifest } from "./postman.js";
