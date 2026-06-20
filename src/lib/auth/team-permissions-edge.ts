import {
  DEFAULT_TEAM_PERMISSIONS,
  parseTeamPermissions,
  type TeamPermissions,
} from "@/domain/settings/team-permissions";

function edgeServiceConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

/** Edge middleware: load team permissions for a tenant (falls back to defaults). */
export async function getTeamPermissionsOnEdge(
  tenantId: string,
): Promise<TeamPermissions> {
  const service = edgeServiceConfig();
  if (!service) return DEFAULT_TEAM_PERMISSIONS;

  const params = new URLSearchParams({
    select: "team_permissions",
    tenant_id: `eq.${tenantId}`,
  });

  const res = await fetch(`${service.url}/rest/v1/pension_settings?${params}`, {
    headers: {
      apikey: service.key,
      Authorization: `Bearer ${service.key}`,
    },
    cache: "no-store",
  });

  if (!res.ok) return DEFAULT_TEAM_PERMISSIONS;

  const rows = (await res.json()) as Array<{ team_permissions?: unknown }>;
  return parseTeamPermissions(rows[0]?.team_permissions);
}
