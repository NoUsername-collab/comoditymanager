import { expect, type Page } from "@playwright/test";

export const IPHONE_13_VIEWPORT = { width: 390, height: 844 };

/** Assert pre-paint mobile boot script resolved compact phone layout. */
export async function expectCompactPhoneLayout(page: Page): Promise<void> {
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-layout-mode", "mobile");
  await expect(html).toHaveAttribute("data-layout-chrome", "compact");
  await expect(html).toHaveAttribute("data-layout-orientation", "portrait");
}

export async function expectNoFatalPageErrors(page: Page): Promise<void> {
  await expect(page.locator("text=Application error")).not.toBeVisible();
  await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
}

/** Touch target minimum used across mobile CSS (44px). */
export const MOBILE_TOUCH_MIN_PX = 44;
