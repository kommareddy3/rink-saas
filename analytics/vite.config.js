import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// RINK Data Analytics — standalone SaaS frontend. Talks to the shared
// API at api.rinkglobal.com (VITE_API_BASE_URL).
export default defineConfig({
  plugins: [react()],
  server: { port: 5174 }, // different port from client/ for local dev
  build: { sourcemap: true },
});
