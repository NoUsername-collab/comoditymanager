export const CACHE_TAGS = {
  pensionSettings: "pension-settings",
  buildings: "buildings",
  rooms: "rooms",
  roomCatalog: "room-catalog",
  roomOptionsByRoom: "room-options-by-room",
  bookingCounts: "booking-counts",
  checkins: "checkins",
  bookingPayments: "booking-payments",
  publicSite: "public-site",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/**
 * Tenant-scoped cache tag for revalidation.
 * Use this instead of raw CACHE_TAGS when revalidating to avoid busting
 * ALL tenants' caches. The cache entries already include both global and
 * tenant-scoped tags — this targets only the specific tenant's entries.
 */
export function tenantTag(tenantId: string, tag: CacheTag): string {
  return `tenant-${tenantId}-${tag}`;
}
