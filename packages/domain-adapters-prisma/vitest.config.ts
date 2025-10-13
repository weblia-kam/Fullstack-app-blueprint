import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    coverage: { enabled: false },
    testTimeout: 120_000,
  },
  resolve: {
    alias: {
      "@org/domain-adapters-prisma": resolve(dir, "./src/index.ts"),
      "@org/domain": resolve(dir, "../domain/src/index.ts"),
    },
  },
});
