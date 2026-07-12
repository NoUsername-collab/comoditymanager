import { normalizeTenantLifecycleStatus } from "@/domain/tenant/operational";

export type TenantHostEdgeLookup = {
  tenantId: string;
  slug: string;
  status: ReturnType<typeof normalizeTenantLifecycleStatus>;
};

type TenantHostRef =
  | { slug: string; customDomain?: undefined }
  | { slug?: undefined; customDomain: string };

function edgeServiceConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

async function fetchTenantHostRows(
  query: string
): Promise<TenantHostEdgeLookup | null> {
  const service = edgeServiceConfig();
  if (!service) return null;

  const res = await fetch(`${service.url}/rest/v1/${query}`, {
    headers: {
      apikey: service.key,
      Authorization: `Bearer ${service.key}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) return null;

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

export async function lookupTenantHostOnEdge(
  ref: TenantHostRef
): Promise<TenantHostEdgeLookup | null> {
  if (ref.slug) {
    return fetchTenantHostRows(
      `tenants?slug=eq.${encodeURIComponent(ref.slug)}&select=id,slug,status&limit=1`
    );
  }

  return fetchTenantHostRows(
    `tenant_domains?domain=eq.${encodeURIComponent(ref.customDomain!)}&select=tenant_id,tenants(id,slug,status)&limit=1`
  );
}
