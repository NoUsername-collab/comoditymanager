import type { TenantDomainRoutingKind } from "@/lib/tenant/domain-routing";
import { createEdgeMemo } from "@/lib/tenant/edge-memo";

type DomainRouting = { tenantId: string; slug: string; routingKind: TenantDomainRoutingKind };

/** A domain's property for a minute (ten seconds when it has none): the proxy asks on every request. */
const domainRoutingMemo = createEdgeMemo<DomainRouting>({
  foundTtlMs: 60_000,
  missingTtlMs: 10_000,
});

function edgeConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

export async function resolveDomainRoutingOnEdge(domain: string): Promise<DomainRouting | null> {
  const key = domain.toLowerCase().trim();
  return (await domainRoutingMemo(key, () => fetchDomainRouting(key))) ?? null;
}

/** The domain's property, null when it has none, undefined when the lookup failed. */
async function fetchDomainRouting(domain: string): Promise<DomainRouting | null | undefined> {
  const cfg = edgeConfig();
  if (!cfg) return undefined;

  const res = await fetch(`${cfg.url}/rest/v1/rpc/resolve_tenant_by_domain`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
    },
    body: JSON.stringify({ p_domain: domain }),
    cache: "no-store",
  });

  if (!res.ok) return undefined;

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
