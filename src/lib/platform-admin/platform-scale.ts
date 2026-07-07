/** Scale targets for Nestio platform admin (100+ tenants). */
export const PLATFORM_SCALE = {
  minSupportedTenants: 100,
  /** Paginated fallback scan when RPC is unavailable. */
  resourceScanPageSize: 2000,
  maxResourceScanPages: 250,
} as const;

export type TenantResourceCounts = {
  member_count: number;
  room_count: number;
  booking_count: number;
  building_count: number;
  has_settings: boolean;
};

export const EMPTY_TENANT_RESOURCE_COUNTS: TenantResourceCounts = {
  member_count: 0,
  room_count: 0,
  booking_count: 0,
  building_count: 0,
  has_settings: false,
};
