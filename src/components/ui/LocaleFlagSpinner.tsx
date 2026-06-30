"use client";

import type { CSSProperties } from "react";
import { useLocale } from "next-intl";
import {
  LOCALE_FLAG_SPINNER,
  normalizeAppLocale,
} from "@/lib/i18n/locale-flag-colors";

type Props = {
  /** Accessible label (e.g. "Se încarcă…") */
  label: string;
  size?: "md" | "lg";
};

export function LocaleFlagSpinner({ label, size = "lg" }: Props) {
  const locale = normalizeAppLocale(useLocale());
  const colors = LOCALE_FLAG_SPINNER[locale];

  return (
    <div
      className={[
        "locale-dots",
        size === "lg" ? "locale-dots--lg" : "locale-dots--md",
      ].join(" ")}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      data-locale={locale}
      style={
        {
          "--dot-c1": colors.c1,
          "--dot-c2": colors.c2,
          "--dot-c3": colors.c3,
        } as CSSProperties
      }
    >
      <span className="locale-dots__dot locale-dots__dot--1" aria-hidden />
      <span className="locale-dots__dot locale-dots__dot--2" aria-hidden />
      <span className="locale-dots__dot locale-dots__dot--3" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}
