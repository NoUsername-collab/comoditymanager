import { pickOwnLocalized } from "@/features/public-site/domain/localized";
import { sectionAnchor } from "@/features/public-site/domain/site-pages";
import type {
  LocalizedText,
  PublicMenuItem,
  PublicSiteConfig,
  PublicSiteSection,
} from "@/features/public-site/domain/types";

export type PublicNavItem = {
  key: string;
  /** None for a group, which only opens its submenu. */
  href?: string;
  label: string;
  cta?: boolean;
  /** A link to another site: opens apart. */
  external?: boolean;
  children?: PublicNavItem[];
};

type Target = { href?: string; name: string; external?: boolean };

function sectionTitle(section: PublicSiteSection, locale: string): string {
  const title = (section.payload as { title?: LocalizedText }).title;
  return pickOwnLocalized(title, locale);
}

/** Where an item goes and the name it takes without its own label; null when its target is gone or hidden. */
function resolveTarget(item: PublicMenuItem, config: PublicSiteConfig, locale: string): Target | null {
  const chrome = config.chrome;
  switch (item.kind) {
    case "home":
      return { href: "/", name: pickOwnLocalized(chrome.navHome, locale) };
    case "privacy":
      return { href: "/confidentialitate", name: pickOwnLocalized(chrome.navPrivacy, locale) };
    case "terms":
      return { href: "/termeni", name: pickOwnLocalized(chrome.navTerms, locale) };
    case "calendar":
      return config.bookingEnabled ? { href: "/calendar", name: pickOwnLocalized(chrome.navBook, locale) } : null;
    case "page": {
      const page = config.sitePages.find((row) => row.id === item.ref);
      if (!page?.visible) return null;
      return { href: `/${page.slug}`, name: pickOwnLocalized(page.title, locale) };
    }
    case "section": {
      const home = config.sections.find((row) => row.id === item.ref);
      if (home) return home.visible ? { href: `/#${sectionAnchor(home.id)}`, name: sectionTitle(home, locale) } : null;
      for (const page of config.sitePages) {
        const section = page.sections.find((row) => row.id === item.ref);
        if (!section) continue;
        if (!page.visible || !section.visible) return null;
        return { href: `/${page.slug}#${sectionAnchor(section.id)}`, name: sectionTitle(section, locale) };
      }
      return null;
    }
    case "url":
      return item.ref ? { href: item.ref, name: item.ref, external: /^https?:\/\//i.test(item.ref) } : null;
    case "group":
      return { name: "" };
  }
}

function resolveItem(item: PublicMenuItem, config: PublicSiteConfig, locale: string): PublicNavItem | null {
  const target = resolveTarget(item, config, locale);
  if (!target) return null;
  const label = (pickOwnLocalized(item.label, locale) || target.name).trim();
  if (!label) return null;
  const children = (item.children ?? [])
    .map((child) => resolveItem(child, config, locale))
    .filter((child): child is PublicNavItem => child !== null);
  // A group with nothing to open is left out.
  if (item.kind === "group" && children.length === 0) return null;
  return {
    key: item.id,
    href: target.href,
    label,
    ...(target.external ? { external: true } : {}),
    ...(children.length > 0 ? { children } : {}),
  };
}

/** The header menu in the visitor's language, then the booking button where the site puts it there. */
export function resolvePublicNavItems(
  config: PublicSiteConfig | null | undefined,
  locale: string,
): PublicNavItem[] {
  if (!config) return [];
  const items = (config.chrome.menu ?? [])
    .map((item) => resolveItem(item, config, locale))
    .filter((item): item is PublicNavItem => item !== null);

  const showBook =
    config.published !== false &&
    config.bookingEnabled &&
    (config.bookingNavPosition === "nav" || config.bookingNavPosition === "both");
  if (showBook) {
    const label = pickOwnLocalized(config.chrome.navBook, locale).trim();
    if (label) items.push({ key: "book", href: "/calendar", label, cta: true });
  }

  return items;
}

/** Whether a link is the page being shown (a section link counts on its own page only by hash, so never). */
export function isNavItemActive(pathname: string, href: string | undefined): boolean {
  if (!href || href.includes("#") || /^https?:/i.test(href)) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
