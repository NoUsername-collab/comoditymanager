import { pickOwnLocalized } from "@/features/public-site/domain/localized";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";

type PublicNavItem = {
  key: "home" | "privacy" | "terms" | "book";
  href: string;
  label: string;
  cta?: boolean;
};

function labeled(
  item: PublicNavItem,
  label: string,
): PublicNavItem | null {
  const text = label.trim();
  if (!text) return null;
  return { ...item, label: text };
}

export function resolvePublicNavItems(
  config: PublicSiteConfig | null | undefined,
  locale: string,
): PublicNavItem[] {
  const chrome = config?.chrome;
  const items: PublicNavItem[] = [];

  if (chrome?.showNavHome !== false) {
    const item = labeled(
      { key: "home", href: "/", label: "" },
      pickOwnLocalized(chrome?.navHome, locale),
    );
    if (item) items.push(item);
  }
  if (chrome?.showNavPrivacy !== false) {
    const item = labeled(
      { key: "privacy", href: "/confidentialitate", label: "" },
      pickOwnLocalized(chrome?.navPrivacy, locale),
    );
    if (item) items.push(item);
  }
  if (chrome?.showNavTerms) {
    const item = labeled(
      { key: "terms", href: "/termeni", label: "" },
      pickOwnLocalized(chrome?.navTerms, locale),
    );
    if (item) items.push(item);
  }

  const showBook =
    !!config &&
    config.published !== false &&
    config.bookingEnabled &&
    (config.bookingNavPosition === "nav" || config.bookingNavPosition === "both");
  if (showBook) {
    const item = labeled(
      { key: "book", href: "/calendar", label: "", cta: true },
      pickOwnLocalized(chrome?.navBook, locale),
    );
    if (item) items.push(item);
  }

  return items;
}
