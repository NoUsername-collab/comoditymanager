import { test, expect } from "@playwright/test";
import {
  expectCompactPhoneLayout,
  expectNoFatalPageErrors,
  IPHONE_13_VIEWPORT,
  MOBILE_TOUCH_MIN_PX,
} from "./helpers/mobile-layout";

test.describe("Mobile UX smoke (390×844 compact)", () => {
  test.use({ viewport: IPHONE_13_VIEWPORT });

  test.describe("public routes", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("calendar: compact layout, form visible, header CTA hidden", async ({
      page,
    }) => {
      await page.goto("/calendar");
      await expect(page).toHaveURL(/\/calendar/);
      await expectCompactPhoneLayout(page);
      await expectNoFatalPageErrors(page);

      await expect(page.locator(".guest-booking-form")).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.locator(".public-header__cta")).toBeHidden();
      await expect(page.locator(".ml-mobile-menu")).toBeVisible();
    });

    test("public drawer opens and traps focus", async ({ page }) => {
      await page.goto("/calendar");
      const trigger = page.locator(".ml-mobile-menu__trigger").first();
      await trigger.click();

      const drawer = page.locator(".ml-drawer--open");
      await expect(drawer).toBeVisible();

      const firstLink = drawer.locator(".ml-drawer__link").first();
      await expect(firstLink).toBeFocused();

      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
      await expect(trigger).toBeFocused();
    });
  });

  test.describe("admin routes (authenticated)", () => {
    test("shell: bottom nav + compact layout", async ({ page }) => {
      await page.goto("/admin");
      await expectCompactPhoneLayout(page);
      await expectNoFatalPageErrors(page);
      await expect(page.locator(".ml-bottom-nav")).toBeVisible();
    });

    test("cazări: full-width search form", async ({ page }) => {
      await page.goto("/admin/cazari");
      await expectCompactPhoneLayout(page);
      await expectNoFatalPageErrors(page);

      const form = page.locator(".cazari-search-form");
      await expect(form).toBeVisible();
      const box = await form.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThan(320);
    });

    test("cazări: stay quick ops meet touch minimum", async ({ page }) => {
      await page.goto("/admin/cazari");
      const op = page.locator(".stay-quick-ops button").first();
      if ((await op.count()) === 0) test.skip();

      const box = await op.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(MOBILE_TOUCH_MIN_PX - 2);
    });

    test("statistics: cards visible, desktop table hidden", async ({ page }) => {
      await page.goto("/admin/statistics");
      await expectCompactPhoneLayout(page);
      await expectNoFatalPageErrors(page);

      const cards = page.locator(".statistics-cards");
      if ((await cards.count()) === 0) {
        await expect(page.locator("text=Nu există")).toBeVisible();
        return;
      }

      await expect(cards.first()).toBeVisible();
      await expect(page.locator(".statistics-table-desktop").first()).toBeHidden();
    });

    test("calendar gantt: bounded scroll region on portrait", async ({ page }) => {
      await page.goto("/admin/calendar");
      await expectCompactPhoneLayout(page);
      await expectNoFatalPageErrors(page);

      const scroll = page.locator(".gantt-scroll").first();
      await expect(scroll).toBeVisible({ timeout: 15_000 });

      const maxHeight = await scroll.evaluate((el) =>
        parseFloat(getComputedStyle(el).maxHeight)
      );
      expect(maxHeight).toBeGreaterThan(0);
      expect(maxHeight).toBeLessThan(844);
    });

    test("admin more drawer restores focus to trigger", async ({ page }) => {
      await page.goto("/admin");
      const more = page.locator(".ml-bottom-nav__link--more");
      await more.click();

      const drawer = page.locator(".ml-drawer--admin.ml-drawer--open");
      await expect(drawer).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
      await expect(more).toBeFocused();
    });

    for (const path of ["/admin/bookings", "/admin/guests", "/admin/settings"]) {
      test(`${path} loads on compact without fatal errors`, async ({ page }) => {
        await page.goto(path);
        await expectCompactPhoneLayout(page);
        await expectNoFatalPageErrors(page);
        await expect(page.locator(".ml-bottom-nav")).toBeVisible();
      });
    }
  });
});
