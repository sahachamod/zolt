export type Template = "atlas" | "api" | "ssr" | "minimal";
export type Database = "postgres" | "mysql" | "sqlite" | "mongodb" | "none";
export type Auth = "local" | "asgardeo" | "keycloak" | "oidc" | "none";
export type Ui = "zolt" | "tailwind" | "none";
export type Infra = "docker" | "docker-kubernetes" | "terraform-ansible" | "full" | "none";
export type Testing = "full" | "basic" | "none";
export type Storage = "none" | "local" | "s3" | "gcs" | "azure";
export type Mail = "none" | "smtp" | "ses" | "sendgrid" | "mailgun";

export interface CreateOptions {
  projectArg?: string;
  template: Template;
  database: Database;
  auth: Auth;
  ui: Ui;
  infra: Infra;
  testing: Testing;
  storage: Storage;
  mail: Mail;
  git: boolean;
  install: boolean;
  force: boolean;
  yes: boolean;
}
