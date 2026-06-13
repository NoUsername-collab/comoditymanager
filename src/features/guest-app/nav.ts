import type { GuestAppFeatureDef, GuestAppFeatureId } from "@/domain/guest-app/types";
import {
  guestAppFeatureHref,
  guestAppHomeHref,
  parseGuestAppFeatureSlug,
} from "@/domain/guest-app/routes";
import { visibleGuestAppFeatures } from "./feature-labels";

export type GuestNavTabId = "home" | GuestAppFeatureId | "menu";

export type GuestNavTab = {
  id: GuestNavTabId;
  href: string;
  featureId?: GuestAppFeatureId;
};

const NAV_PRIORITY: GuestAppFeatureId[] = [
  "wifi",
  "hotel_info",
  "online_checkin",
  "travel_tips",
];

export function buildGuestBottomNav(
  accessCode: string,
  features: GuestAppFeatureDef[],
): GuestNavTab[] {
  const visibleIds = new Set(
    visibleGuestAppFeatures(features).map((feature) => feature.id),
  );
  const tabs: GuestNavTab[] = [{ id: "home", href: guestAppHomeHref(accessCode) }];

  for (const id of NAV_PRIORITY) {
    if (!visibleIds.has(id)) continue;
    tabs.push({
      id,
      featureId: id,
      href: guestAppFeatureHref(accessCode, id),
    });
    if (tabs.length >= 4) break;
  }

  if (tabs.length < 4) {
    tabs.push({
      id: "menu",
      href: `${guestAppHomeHref(accessCode)}#features`,
    });
  }

  return tabs.slice(0, 4);
}

export function resolveActiveGuestNavTab(
  pathname: string,
  accessCode: string,
): GuestNavTabId {
  const home = guestAppHomeHref(accessCode);
  const normalized = pathname.split("?")[0] ?? pathname;
  if (normalized === home || normalized.endsWith(home)) return "home";

  const marker = `${home}/`;
  const idx = normalized.indexOf(marker);
  if (idx === -1) return "home";

  const slug = normalized.slice(idx + marker.length).split("/")[0];
  const featureId = slug ? parseGuestAppFeatureSlug(slug) : null;
  return featureId ?? "home";
}

export function guestNavLabelKey(tab: GuestNavTab): string {
  if (tab.id === "home") return "nav.home";
  if (tab.id === "menu") return "nav.menu";
  return `nav.${tab.id}`;
}
