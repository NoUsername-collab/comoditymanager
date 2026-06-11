import type { GuestAppFeatureDef, GuestAppSettings } from "./types";

/** Feature matrix — mock by default; plata online ascunsă. */
export const DEFAULT_GUEST_APP_FEATURES: GuestAppFeatureDef[] = [
  { id: "hotel_info", state: "mock", sortOrder: 10 },
  { id: "gallery", state: "mock", sortOrder: 20 },
  { id: "online_checkin", state: "mock", sortOrder: 30 },
  { id: "wifi", state: "mock", sortOrder: 40 },
  { id: "facilities", state: "mock", sortOrder: 50 },
  { id: "services", state: "mock", sortOrder: 60 },
  { id: "travel_tips", state: "mock", sortOrder: 70 },
  { id: "green_stay", state: "mock", sortOrder: 80 },
  { id: "online_payment", state: "hidden", sortOrder: 90 },
];

export const DEFAULT_GUEST_APP_SETTINGS: GuestAppSettings = {
  enabled: true,
  appearance: {
    primaryColor: "#0f766e",
    accentColor: "#14b8a6",
  },
  features: DEFAULT_GUEST_APP_FEATURES,
  content: {
    hotel: {
      shortDescription: "Bine ați venit — informații despre unitate (demo).",
      longDescription:
        "Descriere detaliată configurabilă din admin (în curând). Momentan conținut demonstrativ.",
    },
    wifi: {
      networkName: "CasaEmil-Guest",
      password: "demo-wifi",
      instructions: "Conectați-vă la rețeaua de oaspeți folosind datele de mai sus.",
    },
    travelTips: [
      "Plimbare dimineața pe malul apei.",
      "Rezervare masă — întrebați recepția.",
    ],
    greenStay: {
      enabled: true,
      description:
        "Puteți solicita omiterea curățeniei zilnice dacă nu este necesară (demo).",
    },
  },
};
