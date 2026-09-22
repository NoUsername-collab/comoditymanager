import type { LocalizedText, PublicLocale } from "./types";
import { PUBLIC_LOCALES } from "./types";

export function pickLocalized(
  value: LocalizedText | string | null | undefined,
  locale: string,
  fallbacks: string[] = []
): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") {
    return fallbacks.find((item) => item.trim().length > 0)?.trim() ?? "";
  }

  const loc = locale as PublicLocale;
  const chain: PublicLocale[] =
    loc === "ro" ? ["ro", "en", "bg"] : loc === "bg" ? ["bg", "en", "ro"] : ["en", "ro", "bg"];

  for (const key of chain) {
    const text = value[key]?.trim();
    if (text) return text;
  }

  return fallbacks.find((item) => item.trim().length > 0)?.trim() ?? "";
}

/** Read only this locale's stored value — no fallback chain (studio editor). */
export function pickOwnLocalized(
  value: LocalizedText | string | null | undefined,
  locale: string,
): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  return value[asPublicLocale(locale)]?.trim() ?? "";
}

export function localizedFromString(text: string): LocalizedText {
  return { ro: text, en: text, bg: text };
}

const PUBLIC_LOCALE_SET = new Set<string>(PUBLIC_LOCALES);

function asPublicLocale(locale: string): PublicLocale {
  return PUBLIC_LOCALE_SET.has(locale) ? (locale as PublicLocale) : "en";
}

export function coercePublicLocale(locale: string): PublicLocale {
  return asPublicLocale(locale);
}

/** Write one language; leave the other two untouched. */
export function writeLocalized(
  previous: LocalizedText | string | null | undefined,
  locale: string,
  value: string,
): LocalizedText {
  const next: LocalizedText =
    typeof previous === "string"
      ? { ro: previous, en: previous, bg: previous }
      : { ...(previous ?? {}) };
  const key = asPublicLocale(locale);
  const trimmed = value.trim();
  if (!trimmed) {
    delete next[key];
    return next;
  }
  next[key] = trimmed;
  return next;
}

/** Write every locale from a map; empty values delete that key. */
export function writeLocalizedMap(
  previous: LocalizedText | string | null | undefined,
  values: Partial<Record<PublicLocale, string>>,
): LocalizedText {
  let next: LocalizedText =
    typeof previous === "string"
      ? { ro: previous, en: previous, bg: previous }
      : { ...(previous ?? {}) };
  for (const locale of PUBLIC_LOCALES) {
    if (values[locale] === undefined) continue;
    next = writeLocalized(next, locale, values[locale] ?? "");
  }
  return next;
}
