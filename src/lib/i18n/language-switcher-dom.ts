export const LANGUAGE_SWITCHER_MENU_SELECTOR = "[data-language-switcher-menu]";
export const LANGUAGE_SWITCHER_ROOT_SELECTOR = "[data-language-switcher-root]";

/** True when the event target is inside the language switcher UI (including portaled menu). */
export function isLanguageSwitcherEventTarget(target: unknown): boolean {
  if (!target || typeof (target as Element).closest !== "function") return false;
  const el = target as Element;
  return Boolean(
    el.closest(LANGUAGE_SWITCHER_MENU_SELECTOR) ||
      el.closest(LANGUAGE_SWITCHER_ROOT_SELECTOR)
  );
}
