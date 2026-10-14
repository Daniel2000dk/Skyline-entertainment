import { defineConfig, devices } from "@playwright/test";

// Smoke test against a DEPLOYED site (production after a release). It creates a
// temporary staff account and removes it with everything it made afterwards.
// Run only on purpose, with the owner's approval:
//   LIVE_BASE_URL=https://… LIVE_ENV_FILE=<gitignored file> npx playwright test -c playwright.live.config.ts
const baseURL = process.env.LIVE_BASE_URL;
const envFile = process.env.LIVE_ENV_FILE;
if (!baseURL || !envFile) {
  throw new Error("Set LIVE_BASE_URL and LIVE_ENV_FILE (SUPABASE_URL, keys) to run the live test");
}
process.loadEnvFile(envFile);

export default defineConfig({
  testDir: "./e2e-live",
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 240_000,
  use: {
    baseURL,
    locale: "nl-NL",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
});
