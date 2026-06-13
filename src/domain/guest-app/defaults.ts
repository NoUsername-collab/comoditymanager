import type { GuestAppFeatureDef, GuestAppSettings } from "./types";

/** Feature matrix — live by default; plata online ascunsă până la configurare. */
export const DEFAULT_GUEST_APP_FEATURES: GuestAppFeatureDef[] = [
  { id: "hotel_info", state: "live", sortOrder: 10 },
  { id: "gallery", state: "live", sortOrder: 20 },
  { id: "online_checkin", state: "live", sortOrder: 30 },
  { id: "wifi", state: "live", sortOrder: 40 },
  { id: "facilities", state: "live", sortOrder: 50 },
  { id: "services", state: "live", sortOrder: 60 },
  { id: "travel_tips", state: "live", sortOrder: 70 },
  { id: "green_stay", state: "live", sortOrder: 80 },
  { id: "online_payment", state: "hidden", sortOrder: 90 },
];

export const DEFAULT_GUEST_APP_SETTINGS: GuestAppSettings = {
  enabled: true,
  appearance: {
    themeId: "inherit",
    primaryColor: null,
    accentColor: null,
  },
  features: DEFAULT_GUEST_APP_FEATURES,
  content: {
    greenStay: {
      enabled: true,
    },
  },
};
