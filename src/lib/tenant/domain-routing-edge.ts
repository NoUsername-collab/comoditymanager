import type { TenantDomainRoutingKind } from "@/lib/tenant/domain-routing";

function edgeConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

export async function resolveDomainRoutingOnEdge(
  domain: string
): Promise<{ tenantId: string; slug: string; routingKind: TenantDomainRoutingKind } | null> {
  const cfg = edgeConfig();
  if (!cfg) return null;

  const res = await fetch(`${cfg.url}/rest/v1/rpc/resolve_tenant_by_domain`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
    },
    body: JSON.stringify({ p_domain: domain.toLowerCase().trim() }),
    cache: "no-store",
  });

  if (!res.ok) return null;

  const rows = (await res.json()) as Array<{
    tenant_id: string;
    slug: string;
    routing_kind: TenantDomainRoutingKind;
  }>;

  const row = rows?.[0];
  if (!row?.tenant_id || !row.slug) return null;

  return {
    tenantId: row.tenant_id,
    slug: row.slug,
    routingKind: row.routing_kind ?? "custom_full",
  };
}
