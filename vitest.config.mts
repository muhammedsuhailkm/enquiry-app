import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests (React components / hooks) in jsdom. API end-to-end tests stay in scripts/e2e.mjs.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
