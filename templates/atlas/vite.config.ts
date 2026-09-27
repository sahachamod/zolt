import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: process.env.ZOLT_DEV_HOST ?? "127.0.0.1",
    port: 3000,
    proxy: {
      "/api": `http://127.0.0.1:${process.env.ZOLT_API_PORT ?? "3001"}`,
      "/openapi.json": `http://127.0.0.1:${process.env.ZOLT_API_PORT ?? "3001"}`
    }
  },
  preview: { host: "0.0.0.0", port: 3000 },
  build: { sourcemap: true }
});
