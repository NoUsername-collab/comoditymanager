import { test as setup, expect } from "@playwright/test";
import path from "node:path";

const STORAGE_STATE = path.join(__dirname, ".auth", "admin.json");

setup("authenticate as admin", async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing E2E_ADMIN_EMAIL or E2E_ADMIN_PASSWORD env vars. " +
        "Set them before running E2E tests."
    );
  }

  // The default locale is "ro" with localePrefix "as-needed",
  // so /admin/login has no locale prefix.
  await page.goto("/admin/login");

  // Wait for the login form to be visible
  await expect(page.locator("form")).toBeVisible();

  // The username field defaults to "Operator".
  // Clear it and type "Admin" so we use the admin account
  // whose email matches E2E_ADMIN_EMAIL.
  const usernameInput = page.locator('input[name="username"]');
  await usernameInput.fill("Admin");

  // Fill password
  const passwordInput = page.locator('input[name="password"]');
  await passwordInput.fill(password);

  // Submit the form
  await page.locator('button[type="submit"]').click();

  // After successful login, the server action redirects to /admin.
  // Wait until we land on an admin page (not the login page).
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 15_000 });

  // Verify we are on an admin page
  await expect(page).toHaveURL(/\/admin/);

  // Save signed-in state for reuse by other tests
  await page.context().storageState({ path: STORAGE_STATE });
});
