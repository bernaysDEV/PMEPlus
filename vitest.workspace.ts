import { defineWorkspace } from "vitest/config";
import path from "path";
import react from "@vitejs/plugin-react";

// Vitest 2.x workspace: client (jsdom) + server-security (node) tests run
// from a single `npx vitest run` so the security regressions and the
// existing client suite stay in one CI gate.
export default defineWorkspace([
  {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
    },
    test: {
      name: "client",
      environment: "jsdom",
      globals: true,
      setupFiles: ["./client/src/test/setup.ts"],
      include: ["client/src/**/*.{test,spec}.{ts,tsx}"],
      css: false,
    },
  },
  {
    resolve: {
      alias: {
        "@shared": path.resolve(__dirname, "shared"),
      },
    },
    test: {
      name: "server-security",
      environment: "node",
      globals: true,
      include: ["tests/security/**/*.test.ts"],
      testTimeout: 10_000,
    },
  },
]);
