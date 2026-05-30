import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for CasaEmil.
 *
 * Env vars used by auth setup:
 *   E2E_ADMIN_EMAIL     – Supabase admin email
 *   E2E_ADMIN_PASSWORD  – Supabase admin password
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  outputDir: "test-results",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    /* Auth setup — runs first and saves storage state */
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },

    /* Main tests — depend on the auth setup */
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
