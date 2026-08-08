import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 30000,
    fileParallelism: false,
    // Env vars like AUTH_SECRET were only ever populated as a side effect of
    // some earlier test file importing @/lib/db (Prisma Client loads .env on
    // construction) — test files that don't touch the db saw an unset
    // AUTH_SECRET depending on run order. Load .env explicitly instead of
    // relying on that incidental side effect.
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
