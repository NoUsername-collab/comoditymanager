import { test, expect } from "@playwright/test";

test.describe("Public calendar page", () => {
  // Public pages do not require authentication.
  // Override the storageState so we test as an anonymous visitor.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("calendar page loads and shows booking form", async ({ page }) => {
    // Default locale "ro" has no prefix, so /calendar is correct
    await page.goto("/calendar");

    await expect(page).toHaveURL(/\/calendar/);

    // The page should contain the GuestBookingForm which has date inputs
    // and the form element wrapping them.
    const form = page.locator("form");
    await expect(form.first()).toBeVisible({ timeout: 15_000 });

    // Check that the check-in date input exists
    const checkInInput = page.locator('input[type="date"]').first();
    await expect(checkInInput).toBeVisible();
  });

  test("calendar page does not show application errors", async ({ page }) => {
    await page.goto("/calendar");

    await expect(page.locator("text=Application error")).not.toBeVisible();
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
  });
});
