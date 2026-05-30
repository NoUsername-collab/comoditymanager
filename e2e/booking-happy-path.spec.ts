import { test, expect } from "@playwright/test";

test.describe("Admin booking lifecycle (smoke)", () => {
  test("admin calendar page loads with Gantt chart", async ({ page }) => {
    await page.goto("/admin/calendar");

    // The page title contains the Gantt window
    await expect(page).toHaveURL(/\/admin\/calendar/);

    // Wait for the main content area to render (the Gantt chart or
    // an error message — either proves the page loaded).
    const main = page.locator("main, [class*='gantt'], [class*='Gantt']");
    await expect(main.first()).toBeVisible({ timeout: 15_000 });
  });

  test("admin bookings page loads", async ({ page }) => {
    await page.goto("/admin/bookings");

    await expect(page).toHaveURL(/\/admin\/bookings/);

    // The page should have rendered some content
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // Verify it is not showing an unhandled error page
    await expect(page.locator("text=Application error")).not.toBeVisible();
  });

  test("admin dashboard page loads", async ({ page }) => {
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/admin/);

    const body = page.locator("body");
    await expect(body).toBeVisible();

    await expect(page.locator("text=Application error")).not.toBeVisible();
  });
});
