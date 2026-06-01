"use client";

import type { CSSProperties } from "react";
import { useLocale } from "next-intl";
import {
  LOCALE_FLAG_SPINNER,
  normalizeAppLocale,
} from "@/lib/i18n/locale-flag-colors";

type Props = {
  /** Accessible label (e.g. “Se încarcă…”) */
  label: string;
  size?: "md" | "lg";
};

export function LocaleFlagSpinner({ label, size = "lg" }: Props) {
  const locale = normalizeAppLocale(useLocale());
  const colors = LOCALE_FLAG_SPINNER[locale];

  return (
    <div
      className={[
        "locale-flag-spinner",
        size === "lg" ? "locale-flag-spinner--lg" : "locale-flag-spinner--md",
      ].join(" ")}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      data-locale={locale}
      style={
        {
          "--flag-c1": colors.c1,
          "--flag-c2": colors.c2,
          "--flag-c3": colors.c3,
          "--flag-track": colors.track,
          "--flag-glow": colors.glow,
        } as CSSProperties
      }
    >
      <span className="locale-flag-spinner__halo" aria-hidden />
      <span className="locale-flag-spinner__track" aria-hidden />
      <span className="locale-flag-spinner__ring" aria-hidden />
      <span className="locale-flag-spinner__sheen" aria-hidden />
      <span className="locale-flag-spinner__core" aria-hidden />
    </div>
  );
}
