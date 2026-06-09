import { describe, expect, it } from "vitest";
import {
  isLanguageSwitcherEventTarget,
  LANGUAGE_SWITCHER_MENU_SELECTOR,
  LANGUAGE_SWITCHER_ROOT_SELECTOR,
} from "@/lib/i18n/language-switcher-dom";

describe("language-switcher-dom", () => {
  it("exports stable selectors", () => {
    expect(LANGUAGE_SWITCHER_MENU_SELECTOR).toBe("[data-language-switcher-menu]");
    expect(LANGUAGE_SWITCHER_ROOT_SELECTOR).toBe("[data-language-switcher-root]");
  });

  it("returns false for non-element targets", () => {
    expect(isLanguageSwitcherEventTarget(null)).toBe(false);
    expect(isLanguageSwitcherEventTarget({})).toBe(false);
  });
});
