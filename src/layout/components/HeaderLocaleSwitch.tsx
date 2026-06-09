"use client";

import { LanguageSwitcher } from "@/components/public/LanguageSwitcher";

type HeaderLocaleSlot = "nav" | "drawer";

/**
 * One LanguageSwitcher per slot; CSS hides nav vs drawer by data-layout-chrome
 * (boot script sets chrome before paint — no client branch / hydration mismatch).
 */
export function HeaderLocaleSwitch({
  slot,
  suppressHydrationWarning,
}: {
  slot: HeaderLocaleSlot;
  suppressHydrationWarning?: boolean;
}) {
  return (
    <div
      className={[
        "header-locale-switch",
        slot === "nav" ? "header-locale-switch--nav" : "header-locale-switch--drawer",
      ].join(" ")}
      suppressHydrationWarning={suppressHydrationWarning}
    >
      <LanguageSwitcher />
    </div>
  );
}
