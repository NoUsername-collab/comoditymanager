import { throwIfDbError } from "@/lib/nestio-admin/format-db-error";
import {
  EMPTY_TENANT_RESOURCE_COUNTS,
  PLATFORM_SCALE,
  type TenantResourceCounts,
} from "@/lib/nestio-admin/platform-scale";
import type { SupabaseClient } from "@supabase/supabase-js";

type RpcResourceRow = {
  tenant_id: string;
  member_count: number | string;
  room_count: number | string;
  booking_count: number | string;
  building_count: number | string;
  has_settings: boolean;
};

function toNumber(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRpcRow(row: RpcResourceRow): [string, TenantResourceCounts] {
  return [
    row.tenant_id,
    {
      member_count: toNumber(row.member_count),
      room_count: toNumber(row.room_count),
      booking_count: toNumber(row.booking_count),
      building_count: toNumber(row.building_count),
      has_settings: Boolean(row.has_settings),
    },
  ];
}

export function aggregateRowsByTenant(
  rows: Array<{ tenant_id: string | null }>
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.tenant_id) continue;
    counts.set(row.tenant_id, (counts.get(row.tenant_id) ?? 0) + 1);
  }
  return counts;
}

async function scanTenantIdCounts(
  supabase: SupabaseClient,
  table: "tenant_members" | "rooms" | "bookings" | "buildings",
  options?: { activeMembersOnly?: boolean }
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const pageSize = PLATFORM_SCALE.resourceScanPageSize;

  for (let page = 0; page < PLATFORM_SCALE.maxResourceScanPages; page += 1) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from(table).select("tenant_id").range(from, to);
    if (options?.activeMembersOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    throwIfDbError(`${table} (resource scan)`, error);

    const rows = data ?? [];
    if (rows.length === 0) break;

    for (const [tenantId, count] of aggregateRowsByTenant(rows)) {
      counts.set(tenantId, (counts.get(tenantId) ?? 0) + count);
    }

    if (rows.length < pageSize) break;
  }

  return counts;
}

async function loadResourceCountsFallback(
  supabase: SupabaseClient
): Promise<Map<string, TenantResourceCounts>> {
  const [members, rooms, bookings, buildings, settingsRes] = await Promise.all([
    scanTenantIdCounts(supabase, "tenant_members", { activeMembersOnly: true }),
    scanTenantIdCounts(supabase, "rooms"),
    scanTenantIdCounts(supabase, "bookings"),
    scanTenantIdCounts(supabase, "buildings"),
    supabase.from("pension_settings").select("tenant_id"),
  ]);

  throwIfDbError("pension_settings (resource scan)", settingsRes.error);

  const settingsTenants = new Set(
    (settingsRes.data ?? [])
      .map((row) => row.tenant_id)
      .filter((id): id is string => Boolean(id))
  );

  const tenantIds = new Set<string>([
    ...members.keys(),
    ...rooms.keys(),
    ...bookings.keys(),
    ...buildings.keys(),
    ...settingsTenants,
  ]);

  const merged = new Map<string, TenantResourceCounts>();
  for (const tenantId of tenantIds) {
    merged.set(tenantId, {
      member_count: members.get(tenantId) ?? 0,
      room_count: rooms.get(tenantId) ?? 0,
      booking_count: bookings.get(tenantId) ?? 0,
      building_count: buildings.get(tenantId) ?? 0,
      has_settings: settingsTenants.has(tenantId),
    });
  }

  return merged;
}

async function loadResourceCountsRpc(
  supabase: SupabaseClient
): Promise<Map<string, TenantResourceCounts> | null> {
  const { data, error } = await supabase.rpc("platform_tenant_resource_counts");

  if (error) {
    const code = error.code ?? "";
    const message = error.message ?? "";
    const missingRpc =
      code === "42883" ||
      code === "PGRST202" ||
      (message.includes("Could not find the function") &&
        message.includes("platform_tenant_resource_counts")) ||
      (message.includes("does not exist") &&
        message.includes("platform_tenant_resource_counts"));
    if (missingRpc) return null;
    throwIfDbError("platform_tenant_resource_counts (rpc)", error);
  }

  const map = new Map<string, TenantResourceCounts>();
  for (const row of (data ?? []) as RpcResourceRow[]) {
    const [tenantId, counts] = normalizeRpcRow(row);
    map.set(tenantId, counts);
  }
  return map;
}

/** One round-trip (RPC) or bounded fallback scan — safe for 100+ tenants. */
export async function loadTenantResourceCounts(
  supabase: SupabaseClient
): Promise<Map<string, TenantResourceCounts>> {
  const rpcCounts = await loadResourceCountsRpc(supabase);
  if (rpcCounts) return rpcCounts;
  return loadResourceCountsFallback(supabase);
}

export function getTenantResourceCounts(
  map: Map<string, TenantResourceCounts>,
  tenantId: string
): TenantResourceCounts {
  return map.get(tenantId) ?? { ...EMPTY_TENANT_RESOURCE_COUNTS };
}
