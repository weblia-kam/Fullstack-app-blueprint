import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.spec.ts"],
  },
  resolve: {
    alias: {
      "@org/domain": resolve(dir, "../../packages/domain/src/index.ts"),
      "@org/domain-adapters-prisma": resolve(dir, "../../packages/domain-adapters-prisma/src/index.ts"),
    },
  },
});
