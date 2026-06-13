import type {
  GuestAccessBookingSnapshot,
  GuestAppFeatureDef,
  GuestAppFeatureId,
  GuestAppSettings,
} from "@/domain/guest-app/types";
import type { GuestAppResolvedContext } from "@/services/guest-app/resolve-context";

export type GuestAppFeatureVisibilityOptions = {
  greenStayEnabled?: boolean;
  showOnlinePayment?: boolean;
};

const FEATURE_LABELS: Record<GuestAppFeatureId, string> = {
  hotel_info: "Despre unitate",
  gallery: "Galerie foto",
  online_checkin: "Check-in online",
  wifi: "Wi-Fi",
  facilities: "Facilități",
  services: "Servicii",
  travel_tips: "Sfaturi",
  green_stay: "Opțiune verde",
  online_payment: "Plată online",
};

export function guestAppFeatureLabel(id: GuestAppFeatureId): string {
  return FEATURE_LABELS[id] ?? id;
}

export function visibleGuestAppFeatures(
  features: GuestAppFeatureDef[],
  options: GuestAppFeatureVisibilityOptions = {},
): GuestAppFeatureDef[] {
  const greenStayEnabled = options.greenStayEnabled ?? true;
  const showOnlinePayment = options.showOnlinePayment ?? false;

  return features
    .filter((feature) => {
      if (feature.state === "hidden") return false;
      if (feature.id === "green_stay" && !greenStayEnabled) return false;
      if (feature.id === "online_payment") {
        return showOnlinePayment;
      }
      return true;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function visibleGuestAppFeaturesForBooking(
  settings: GuestAppSettings,
  booking: GuestAccessBookingSnapshot,
): GuestAppFeatureDef[] {
  return visibleGuestAppFeatures(settings.features, {
    greenStayEnabled: settings.content.greenStay?.enabled !== false,
    showOnlinePayment: booking.totalPrice != null && booking.totalPrice > 0,
  });
}

export function guestAppFeatureBadge(
  feature: GuestAppFeatureDef,
): string | null {
  if (feature.state === "mock") return "Demo";
  return null;
}

export function isGuestFeatureReady(
  featureId: GuestAppFeatureId,
  ctx: GuestAppResolvedContext,
): boolean {
  switch (featureId) {
    case "hotel_info":
      return Boolean(
        ctx.hotel.shortDescription ||
          ctx.hotel.longDescription ||
          ctx.hotel.phone ||
          ctx.hotel.email ||
          ctx.hotel.address,
      );
    case "wifi":
      return Boolean(ctx.wifi?.networkName || ctx.wifi?.password);
    case "travel_tips":
      return ctx.travelTips.length > 0;
    case "gallery":
      return ctx.galleryItems.length > 0;
    case "facilities":
      return ctx.facilities.length > 0;
    case "services":
      return ctx.services.length > 0;
    case "online_checkin":
      return true;
    case "green_stay":
      return ctx.greenStay?.enabled !== false;
    case "online_payment":
      return ctx.booking.totalPrice != null && ctx.booking.totalPrice > 0;
    default:
      return true;
  }
}
