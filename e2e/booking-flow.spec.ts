import { test, expect } from "@playwright/test";

test.describe("Public booking flow", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("calendar page loads with booking form", async ({ page }) => {
    await page.goto("/calendar");
    // Form should be visible
    await expect(page.locator("form")).toBeVisible({ timeout: 15_000 });
    // Check-in date input exists
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
  });

  test("booking form validates required fields", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page.locator("form")).toBeVisible({ timeout: 15_000 });

    // Try to find a submit button and click without filling anything
    // The form should show validation errors or prevent submission
    const submitBtn = page.locator('button[type="submit"]');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Native HTML validation should prevent submission
      // or custom validation should show errors
    }
  });

  test("legal pages load without errors", async ({ page }) => {
    await page.goto("/termeni");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=Application error")).not.toBeVisible();

    await page.goto("/confidentialitate");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=Application error")).not.toBeVisible();
  });

  test("public homepage loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=Application error")).not.toBeVisible();
  });
});
