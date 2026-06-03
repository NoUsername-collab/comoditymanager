import { test, expect } from "@playwright/test";

test.describe("Admin panel navigation", () => {
  const adminPages = [
    { path: "/admin", name: "Dashboard" },
    { path: "/admin/calendar", name: "Calendar/Gantt" },
    { path: "/admin/bookings", name: "Bookings" },
    { path: "/admin/guests", name: "Guests" },
    { path: "/admin/disponibilitate", name: "Availability" },
    { path: "/admin/rooms", name: "Rooms" },
    { path: "/admin/buildings", name: "Buildings" },
    { path: "/admin/settings", name: "Settings" },
    { path: "/admin/istoric", name: "History" },
    { path: "/admin/statistics", name: "Statistics" },
  ];

  for (const { path, name } of adminPages) {
    test(`${name} page (${path}) loads without errors`, async ({ page }) => {
      await page.goto(path);

      // Should stay on admin (not redirect to login)
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/")));

      // Main content should render
      await expect(page.locator("body")).toBeVisible();

      // No unhandled errors
      await expect(
        page.locator("text=Application error")
      ).not.toBeVisible({ timeout: 10_000 });
      await expect(
        page.locator("text=Internal Server Error")
      ).not.toBeVisible();
    });
  }
});
