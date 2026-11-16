import { normalizeTenantLifecycleStatus } from "@/domain/tenant/operational";
import { createEdgeMemo } from "@/lib/tenant/edge-memo";

type TenantHostEdgeLookup = {
  tenantId: string;
  slug: string;
  status: ReturnType<typeof normalizeTenantLifecycleStatus>;
};

type TenantHostRef =
  { slug: string; customDomain?: undefined } | { slug?: undefined; customDomain: string };

function edgeServiceConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

/** A host's property for a minute (ten seconds when there is none): the proxy asks on every request. */
const tenantHostMemo = createEdgeMemo<TenantHostEdgeLookup>({
  foundTtlMs: 60_000,
  missingTtlMs: 10_000,
});

/** The property, null when there is none, undefined when the lookup failed. */
async function fetchTenantHostRows(
  query: string,
): Promise<TenantHostEdgeLookup | null | undefined> {
  const service = edgeServiceConfig();
  if (!service) return undefined;

  const res = await fetch(`${service.url}/rest/v1/${query}`, {
    headers: {
      apikey: service.key,
      Authorization: `Bearer ${service.key}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) return undefined;

  const rows = (await res.json()) as Array<{
    id?: string;
    slug?: string;
    status?: string;
    tenant_id?: string;
    tenants?: { id?: string; slug?: string; status?: string } | null;
  }>;

  const row = rows?.[0];
  if (!row) return null;

  const nested = row.tenants;
  const tenantId = nested?.id ?? row.id ?? row.tenant_id;
  const slug = nested?.slug ?? row.slug;
  const status = nested?.status ?? row.status;

  if (!tenantId || !slug) return null;

  return {
    tenantId,
    slug,
    status: normalizeTenantLifecycleStatus(status),
  };
}

/** The host's property; null when there is none, undefined when the lookup failed. */
export async function lookupTenantHostOnEdge(
  ref: TenantHostRef,
): Promise<TenantHostEdgeLookup | null | undefined> {
  if (ref.slug) {
    const slug = ref.slug;
    return tenantHostMemo(`slug:${slug}`, () =>
      fetchTenantHostRows(
        `tenants?slug=eq.${encodeURIComponent(slug)}&select=id,slug,status&limit=1`,
      ),
    );
  }

  const domain = ref.customDomain!;
  return tenantHostMemo(`domain:${domain}`, () =>
    fetchTenantHostRows(
      `tenant_domains?domain=eq.${encodeURIComponent(domain)}&select=tenant_id,tenants(id,slug,status)&limit=1`,
    ),
  );
}
