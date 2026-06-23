import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import type { TenantDomainRoutingKind } from "@/lib/tenant/domain-routing";

export type TenantDomainRow = {
  id: string;
  tenant_id: string;
  domain: string;
  routing_kind: TenantDomainRoutingKind;
  verified: boolean;
  verified_at: string | null;
  ssl_active: boolean;
  created_at: string;
};

const TENANT_DOMAIN_SELECT =
  "id, tenant_id, domain, routing_kind, verified, verified_at, ssl_active, created_at";

function tenantDomainsCacheTag(tenantId: string): string {
  return `tenant-${tenantId}-domains`;
}

async function listTenantDomainsUncached(
  tenantId: string
): Promise<TenantDomainRow[]> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("tenant_domains")
    .select(TENANT_DOMAIN_SELECT)
    .eq("tenant_id", tenantId)
    .order("routing_kind", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TenantDomainRow[];
}

const getCachedTenantDomains = (tenantId: string) =>
  unstable_cache(
    () => listTenantDomainsUncached(tenantId),
    ["tenant-domains", tenantId],
    {
      tags: [tenantDomainsCacheTag(tenantId)],
      revalidate: 300,
    }
  );

const loadTenantDomains = cache(async (tenantId: string): Promise<TenantDomainRow[]> =>
  getCachedTenantDomains(tenantId)()
);

export async function listTenantDomains(
  tenantId: string
): Promise<TenantDomainRow[]> {
  return loadTenantDomains(tenantId);
}

export async function addCustomTenantDomain(
  tenantId: string,
  domain: string,
  routingKind: TenantDomainRoutingKind
): Promise<string> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase.rpc("add_tenant_domain", {
    p_tenant_id: tenantId,
    p_domain: domain.toLowerCase().trim(),
    p_routing_kind: routingKind,
  });

  if (error) throw new Error(error.message);
  return String(data);
}

export async function markTenantDomainVerified(
  domainId: string,
  tenantId: string
): Promise<void> {
  const supabase = createPublicAdminClient();
  const { error } = await supabase
    .from("tenant_domains")
    .update({
      verified: true,
      verified_at: new Date().toISOString(),
      ssl_active: true,
    })
    .eq("id", domainId)
    .eq("tenant_id", tenantId)
    .neq("routing_kind", "hospira_subdomain");

  if (error) throw new Error(error.message);
}

export async function removeCustomTenantDomain(
  domainId: string,
  tenantId: string
): Promise<void> {
  const supabase = createPublicAdminClient();
  const { error } = await supabase
    .from("tenant_domains")
    .delete()
    .eq("id", domainId)
    .eq("tenant_id", tenantId)
    .neq("routing_kind", "hospira_subdomain");

  if (error) throw new Error(error.message);
}
