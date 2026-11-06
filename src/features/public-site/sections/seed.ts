import { localizedFromString } from "@/features/public-site/domain/localized";
import type { LocalizedText } from "@/features/public-site/domain/types";

/** A default text as stored: one string for every language, or already per language. */
export function seedText(value: LocalizedText | string | undefined): LocalizedText {
  if (!value) return {};
  return typeof value === "string" ? localizedFromString(value) : value;
}
