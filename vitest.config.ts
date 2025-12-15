import { defineConfig } from "vitest/config";
import path from "path";
import react from "@vitejs/plugin-react";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  plugins: [react()],
  resolve: {
    alias: [
      // More specific aliases first
      { find: "@/server", replacement: path.resolve(templateRoot, "server") },
      { find: "@shared", replacement: path.resolve(templateRoot, "shared") },
      { find: "@assets", replacement: path.resolve(templateRoot, "attached_assets") },
      // Least specific last - client imports
      { find: "@", replacement: path.resolve(templateRoot, "client", "src") },
    ],
  },
  test: {
    globals: true,
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "client/src/**/*.test.ts",
      "client/src/**/*.test.tsx",
    ],
    // Default to jsdom since most tests are UI tests
    environment: "jsdom",
    // Override to node for server tests
    environmentMatchGlobs: [
      ["server/**/*.test.ts", "node"],
      ["server/**/*.spec.ts", "node"],
    ],
    setupFiles: ["./vitest.setup.ts"],
  },
});
