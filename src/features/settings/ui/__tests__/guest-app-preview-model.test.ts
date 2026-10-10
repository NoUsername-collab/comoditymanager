import { describe, expect, it } from "vitest";
import { DEFAULT_GUEST_APP_FEATURES } from "@/domain/guest-app/defaults";
import {
  guestAppPreviewFeatures,
  studioDraftToGuestAppSettings,
  type GuestAppStudioDraft,
} from "@/features/settings/ui/guest-app-preview-model";

const draft: GuestAppStudioDraft = {
  enabled: true,
  usePrimaryContact: true,
  themeId: "inherit",
  primaryColor: "#d6b55a",
  accentColor: "#e8cc72",
  features: DEFAULT_GUEST_APP_FEATURES.map((feature) =>
    feature.id === "gallery" ? { ...feature, state: "hidden" } : feature,
  ),
  shortDescription: "Quiet rooms near the park",
  longDescription: "",
  address: "Cluj",
  hotelPhone: "",
  hotelEmail: "",
  website: "",
  wifiName: "CasaGuest",
  wifiPassword: "stay-well",
  wifiInstructions: "",
  travelTips: "Walk to the square",
  greenDescription: "",
  greenEnabled: false,
  facilitiesText: "Garden | Shared yard",
  servicesText: "",
  loyaltyEnabled: false,
  nightsForPerk: 5,
  perkTitle: "",
  perkDescription: "",
};

describe("guest app settings preview model", () => {
  it("hides gallery and green stay from the preview feature list", () => {
    const settings = studioDraftToGuestAppSettings(draft);
    const ids = guestAppPreviewFeatures(settings).map((feature) => feature.id);
    expect(ids).not.toContain("gallery");
    expect(ids).not.toContain("green_stay");
    expect(ids).toContain("wifi");
    expect(settings.content.wifi?.networkName).toBe("CasaGuest");
  });

  it("persists the property loyalty program on the studio draft", () => {
    const settings = studioDraftToGuestAppSettings({
      ...draft,
      loyaltyEnabled: true,
      nightsForPerk: 8,
      perkTitle: "Late checkout",
      perkDescription: "Until 13:00",
    });
    expect(settings.loyalty).toEqual({
      enabled: true,
      nightsForPerk: 8,
      perkTitle: "Late checkout",
      perkDescription: "Until 13:00",
    });
  });
});
