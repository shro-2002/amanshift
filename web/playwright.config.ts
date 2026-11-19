import { defineConfig } from "@playwright/test";

const BASE = process.env.AMANSHIFT_URL ?? "http://localhost:8090";
// Hosted demos (e.g. Render free tier, ~0.1 CPU) answer in ~1–2 s per call; give assertions room there.
const REMOTE = !/localhost|127\.0\.0\.1/.test(BASE);
export default defineConfig({
  testDir: "tests/e2e",
  timeout: REMOTE ? 180_000 : 60_000,
  expect: { timeout: REMOTE ? 20_000 : 5_000 },
  use: { baseURL: BASE, viewport: { width: 1440, height: 900 } },
  reporter: [["list"]],
});
