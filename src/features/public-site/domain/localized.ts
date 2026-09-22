import type { LocalizedText, PublicLocale } from "./types";

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

export function localizedFromString(text: string): LocalizedText {
  return { ro: text, en: text, bg: text };
}

const PUBLIC_LOCALES: PublicLocale[] = ["ro", "en", "bg"];

function asPublicLocale(locale: string): PublicLocale {
  return PUBLIC_LOCALES.includes(locale as PublicLocale)
    ? (locale as PublicLocale)
    : "en";
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
