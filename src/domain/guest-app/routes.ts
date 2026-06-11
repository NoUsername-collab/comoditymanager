import type { GuestAppFeatureId } from "./types";

const FEATURE_SLUG: Record<GuestAppFeatureId, string> = {
  hotel_info: "hotel",
  gallery: "gallery",
  online_checkin: "check-in",
  wifi: "wifi",
  services: "services",
  facilities: "facilities",
  travel_tips: "tips",
  green_stay: "green-stay",
  online_payment: "payment",
};

const SLUG_TO_FEATURE = Object.fromEntries(
  Object.entries(FEATURE_SLUG).map(([id, slug]) => [slug, id]),
) as Record<string, GuestAppFeatureId>;

export function guestAppFeatureSlug(id: GuestAppFeatureId): string {
  return FEATURE_SLUG[id];
}

export function parseGuestAppFeatureSlug(
  slug: string,
): GuestAppFeatureId | null {
  return SLUG_TO_FEATURE[slug] ?? null;
}

export function guestAppFeatureHref(
  accessCode: string,
  id: GuestAppFeatureId,
): string {
  return `/stay/${accessCode}/${guestAppFeatureSlug(id)}`;
}

export function guestAppHomeHref(accessCode: string): string {
  return `/stay/${accessCode}`;
}
