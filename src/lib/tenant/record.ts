import { resolvePlanId } from "@/core/config/plans";
import type { TenantRecord } from "@/core/tenant/context";
import type { TenantRow } from "@/services/tenants";

/** Map DB tenant row → runtime tenant record (no client-specific defaults). */
export function tenantRowToRecord(row: TenantRow): TenantRecord {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    planId: resolvePlanId(row.plan_id),
    activeModules: (row.active_modules ?? []) as TenantRecord["activeModules"],
    mode: "cloud",
    locale: (row.locale === "en" || row.locale === "bg" ? row.locale : "ro") as TenantRecord["locale"],
    country: (row.country === "MD" || row.country === "BG" ? row.country : "RO") as TenantRecord["country"],
    timezone: row.timezone || "Europe/Bucharest",
    customDomain: null,
    status:
      row.status === "trial" ||
      row.status === "suspended" ||
      row.status === "cancelled"
        ? row.status
        : "active",
    trialEndsAt: row.trial_ends_at,
    createdAt: row.created_at,
  };
}
