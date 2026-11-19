import { defineConfig } from "@playwright/test";

const BASE = process.env.AMANSHIFT_URL ?? "http://localhost:8090";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  use: { baseURL: BASE, viewport: { width: 1440, height: 900 } },
  reporter: [["list"]],
});
