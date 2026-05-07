import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Standalone client config kept for editor / IDE integrations that don't
// understand the workspace file. The actual test runs are driven by
// `vitest.workspace.ts`, which adds the server-security project.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./client/src/test/setup.ts"],
    include: ["client/src/**/*.{test,spec}.{ts,tsx}"],
    css: false,
  },
});
