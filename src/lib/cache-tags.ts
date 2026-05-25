export const CACHE_TAGS = {
  pensionSettings: "pension-settings",
  buildings: "buildings",
  rooms: "rooms",
  roomCatalog: "room-catalog",
  roomOptionsByRoom: "room-options-by-room",
  bookingCounts: "booking-counts",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
