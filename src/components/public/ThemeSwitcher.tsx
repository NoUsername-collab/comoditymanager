"use client";

import {
  PRESENTATION_THEMES,
  type PresentationThemeId,
} from "@/lib/presentation-themes";
import { usePresentationTheme } from "./ThemeProvider";

/** Selector paletă — în footer (nu mai acoperă header-ul). */
export function ThemeSwitcher({ compact }: { compact?: boolean }) {
  const { theme, setTheme } = usePresentationTheme();

  return (
    <div className="public-theme-switcher" role="group" aria-label="Paletă culori site">
      {PRESENTATION_THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTheme(t.id as PresentationThemeId)}
          title={t.label}
          className={[
            "public-theme-switcher__btn",
            theme === t.id && "public-theme-switcher__btn--active",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span
            className="public-theme-switcher__dot"
            style={{ backgroundColor: t.swatch }}
          />
          {!compact && <span>{t.short}</span>}
        </button>
      ))}
    </div>
  );
}
