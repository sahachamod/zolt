import { defineConfig } from "@zolt-framework/core";

export default defineConfig({
  app: { name: "__PROJECT_NAME__", environment: "development" },
  server: { host: "0.0.0.0", port: 3000 },
  database: { driver: "__DATABASE_DRIVER__" },
  authentication: { provider: "__AUTH_PROVIDER__", tenantRequired: true },
  services: { storage: "__STORAGE_PROVIDER__", mail: "__MAIL_PROVIDER__" },
  frontend: { tsx: true, tailwind: __TAILWIND__ }
});
