import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// React 19 + Vite 7. Plugin handles JSX, Fast Refresh, and automatic JSX runtime.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    sourcemap: true,
  },
});
