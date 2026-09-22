import { pickLocalized } from "@/features/public-site/domain/localized";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";

export type PublicNavItem = {
  key: "home" | "privacy" | "terms" | "book";
  href: string;
  label: string;
  cta?: boolean;
};

export function resolvePublicNavItems(
  config: PublicSiteConfig | null | undefined,
  locale: string,
  fallback: { home: string; privacy: string; terms: string; book: string },
): PublicNavItem[] {
  const chrome = config?.chrome;
  const items: PublicNavItem[] = [];

  if (chrome?.showNavHome !== false) {
    items.push({
      key: "home",
      href: "/",
      label: pickLocalized(chrome?.navHome, locale, [fallback.home]),
    });
  }
  if (chrome?.showNavPrivacy !== false) {
    items.push({
      key: "privacy",
      href: "/confidentialitate",
      label: pickLocalized(chrome?.navPrivacy, locale, [fallback.privacy]),
    });
  }
  if (chrome?.showNavTerms) {
    items.push({
      key: "terms",
      href: "/termeni",
      label: pickLocalized(chrome?.navTerms, locale, [fallback.terms]),
    });
  }

  const showBook =
    !!config &&
    config.published !== false &&
    config.bookingEnabled &&
    (config.bookingNavPosition === "nav" || config.bookingNavPosition === "both");
  if (showBook) {
    items.push({
      key: "book",
      href: "/calendar",
      label: pickLocalized(chrome?.navBook, locale, [fallback.book]),
      cta: true,
    });
  }

  return items;
}
