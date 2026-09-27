import { DEFAULT_GUEST_APP_FEATURES } from "@/domain/guest-app/defaults";
import type {
  GuestAppFeatureDef,
  GuestAppListItem,
  GuestAppSettings,
} from "@/domain/guest-app/types";
import type { GuestAppThemeSource } from "@/design/themes/types";
import { visibleGuestAppFeatures } from "@/features/guest-app/feature-labels";

export type GuestAppStudioDraft = {
  enabled: boolean;
  usePrimaryContact: boolean;
  themeId: GuestAppThemeSource;
  primaryColor: string;
  accentColor: string;
  features: GuestAppFeatureDef[];
  shortDescription: string;
  longDescription: string;
  address: string;
  hotelPhone: string;
  hotelEmail: string;
  website: string;
  wifiName: string;
  wifiPassword: string;
  wifiInstructions: string;
  travelTips: string;
  greenDescription: string;
  greenEnabled: boolean;
  facilitiesText: string;
  servicesText: string;
};

export function linesToList(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function listItemsToLines(items: GuestAppListItem[] | undefined): string {
  return (items ?? [])
    .map((item) => {
      const parts = [item.icon, item.title, item.description].filter(Boolean);
      return parts.join(" | ");
    })
    .join("\n");
}

export function linesToListItems(raw: string): GuestAppListItem[] {
  return linesToList(raw).map((line) => {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length >= 3) {
      return { icon: parts[0], title: parts[1], description: parts[2] };
    }
    if (parts.length === 2) {
      return { title: parts[0], description: parts[1] };
    }
    return { title: line };
  });
}

export function buildGuestAppStudioDraft(settings: GuestAppSettings): GuestAppStudioDraft {
  const hotel = settings.content.hotel ?? {};
  const wifi = settings.content.wifi ?? {};
  const green = settings.content.greenStay ?? {};
  return {
    enabled: settings.enabled,
    usePrimaryContact: settings.usePrimaryContact ?? true,
    themeId: settings.appearance.themeId ?? "inherit",
    primaryColor: settings.appearance.primaryColor ?? "#d6b55a",
    accentColor: settings.appearance.accentColor ?? "#e8cc72",
    features:
      settings.features.length > 0 ? settings.features : DEFAULT_GUEST_APP_FEATURES,
    shortDescription: hotel.shortDescription ?? "",
    longDescription: hotel.longDescription ?? "",
    address: hotel.address ?? "",
    hotelPhone: hotel.phone ?? "",
    hotelEmail: hotel.email ?? "",
    website: hotel.website ?? "",
    wifiName: wifi.networkName ?? "",
    wifiPassword: wifi.password ?? "",
    wifiInstructions: wifi.instructions ?? "",
    travelTips: (settings.content.travelTips ?? []).join("\n"),
    greenDescription: green.description ?? "",
    greenEnabled: green.enabled ?? true,
    facilitiesText: listItemsToLines(settings.content.facilities),
    servicesText: listItemsToLines(settings.content.services),
  };
}

export function studioDraftToGuestAppSettings(
  draft: GuestAppStudioDraft,
): GuestAppSettings {
  return {
    enabled: draft.enabled,
    usePrimaryContact: draft.usePrimaryContact,
    appearance: {
      themeId: draft.themeId,
      primaryColor: draft.themeId === "custom" ? draft.primaryColor : null,
      accentColor: draft.themeId === "custom" ? draft.accentColor : null,
      logoUrl: null,
    },
    features: draft.features,
    content: {
      hotel: {
        shortDescription: draft.shortDescription.trim() || undefined,
        longDescription: draft.longDescription.trim() || undefined,
        address: draft.address.trim() || undefined,
        phone: draft.hotelPhone.trim() || undefined,
        email: draft.hotelEmail.trim() || undefined,
        website: draft.website.trim() || undefined,
      },
      wifi: {
        networkName: draft.wifiName.trim() || undefined,
        password: draft.wifiPassword.trim() || undefined,
        instructions: draft.wifiInstructions.trim() || undefined,
      },
      travelTips: linesToList(draft.travelTips),
      facilities: linesToListItems(draft.facilitiesText),
      services: linesToListItems(draft.servicesText),
      greenStay: {
        enabled: draft.greenEnabled,
        description: draft.greenDescription.trim() || undefined,
      },
    },
  };
}

export function guestAppPreviewFeatures(settings: GuestAppSettings): GuestAppFeatureDef[] {
  return visibleGuestAppFeatures(settings.features, {
    greenStayEnabled: settings.content.greenStay?.enabled !== false,
    showOnlinePayment: false,
  });
}
