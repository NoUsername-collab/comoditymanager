import type { GuestAppFeatureDef, GuestAppFeatureId } from "@/domain/guest-app/types";

const FEATURE_LABELS: Record<GuestAppFeatureId, string> = {
  hotel_info: "Despre unitate",
  gallery: "Galerie foto",
  online_checkin: "Check-in online",
  wifi: "Wi-Fi",
  facilities: "Facilități",
  services: "Servicii",
  travel_tips: "Sfaturi & recomandări",
  green_stay: "Opțiune verde",
  online_payment: "Plată online",
};

export function visibleGuestAppFeatures(
  features: GuestAppFeatureDef[],
): GuestAppFeatureDef[] {
  return features
    .filter((f) => f.state !== "hidden")
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function guestAppFeatureLabel(id: GuestAppFeatureId): string {
  return FEATURE_LABELS[id];
}

export function guestAppFeatureBadge(
  state: GuestAppFeatureDef["state"],
): string | null {
  if (state === "mock") return "Demo";
  if (state === "live") return null;
  return null;
}
