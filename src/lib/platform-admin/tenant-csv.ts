import type { PlatformTenantSummary } from "@/services/platform-admin";

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

/** Export tenant list as CSV (UTF-8, no BOM). */
export function tenantsToCsv(tenants: PlatformTenantSummary[]): string {
  const headers = [
    "id",
    "display_name",
    "slug",
    "status",
    "plan_id",
    "owner_email",
    "is_paying",
    "room_count",
    "booking_count",
    "member_count",
    "created_at",
  ];

  const rows = tenants.map((tenant) =>
    [
      tenant.id,
      tenant.display_name,
      tenant.slug,
      tenant.status,
      tenant.plan_id || "free",
      tenant.owner_email ?? "",
      tenant.is_paying ? "yes" : "no",
      tenant.room_count,
      tenant.booking_count,
      tenant.member_count,
      tenant.created_at,
    ]
      .map(escapeCsvCell)
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}
