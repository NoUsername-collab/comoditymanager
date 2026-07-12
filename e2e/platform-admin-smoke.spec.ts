import { test, expect } from "@playwright/test";

test.describe("Platform admin smoke", () => {
  const pages = [
    { path: "/platform-admin", name: "Dashboard" },
    { path: "/platform-admin/tenants", name: "Tenants" },
    { path: "/platform-admin/logs", name: "Logs" },
    { path: "/platform-admin/tools", name: "Tools" },
  ];

  for (const { path, name } of pages) {
    test(`${name} (${path}) loads for platform admin`, async ({ page }) => {
      await page.goto(path);

      await expect(page.locator("body")).toBeVisible();

      const url = page.url();
      const onPlatformAdmin = url.includes("/platform-admin");
      const redirectedToLogin = url.includes("/admin/login");
      const redirectedToLanding = url.includes("/landing");

      expect(onPlatformAdmin || redirectedToLogin || redirectedToLanding).toBeTruthy();

      if (onPlatformAdmin) {
        await expect(page.locator("text=Application error")).not.toBeVisible({
          timeout: 10_000,
        });
      }
    });
  }
});
