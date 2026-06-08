/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  REZOVA — Tenant Service                                       ║
 * ║                                                                ║
 * ║  Reads tenant info from the `tenants` table.                   ║
 * ║  Fallback to env vars for backward compatibility.              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { unstable_cache } from "next/cache";
import { platformPensionNameFallback } from "@/lib/platform/branding";
import { createPublicAdminClient } from "@/lib/supabase/admin";

const TENANT_ROW_SELECT =
  "id, slug, display_name, plan_id, active_modules, locale, country, timezone, status, trial_ends_at, owner_id, owner_email, is_paying, stripe_customer_id, stripe_subscription_id, created_at, updated_at";

export type TenantRow = {
  id: string;
  slug: string;
  display_name: string;
  plan_id: string;
  active_modules: string[];
  locale: string;
  country: string;
  timezone: string;
  status: string;
  trial_ends_at: string | null;
  owner_id: string | null;
  owner_email: string;
  is_paying: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
};

/** First tenant by creation time — dev/local fallback when host has no slug. */
export async function getDefaultTenant(): Promise<TenantRow | null> {
  try {
    const supabase = createPublicAdminClient();
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data as TenantRow;
  } catch {
    return null;
  }
}

/**
 * Get tenant by ID.
 */
export async function getTenantById(
  tenantId: string
): Promise<TenantRow | null> {
  try {
    const supabase = createPublicAdminClient();
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    if (error || !data) return null;
    return data as TenantRow;
  } catch {
    return null;
  }
}

async function fetchTenantBySlug(slug: string): Promise<TenantRow | null> {
  try {
    const supabase = createPublicAdminClient();
    const { data, error } = await supabase
      .from("tenants")
      .select(TENANT_ROW_SELECT)
      .eq("slug", slug)
      .in("status", ["active", "trial"])
      .maybeSingle();

    if (error || !data) return null;
    return data as TenantRow;
  } catch {
    return null;
  }
}

const getCachedTenantBySlug = (slug: string) =>
  unstable_cache(
    () => fetchTenantBySlug(slug),
    ["tenant-by-slug", slug],
    { revalidate: 300, tags: [`tenant-slug-${slug}`] }
  );

/** Lookup by URL slug ({slug}.hospira.ro). */
export async function getTenantBySlug(slug: string): Promise<TenantRow | null> {
  return getCachedTenantBySlug(slug)();
}

/** Lookup by custom domain (rezervari.pensiunea.ro). */
export async function getTenantByDomain(domain: string): Promise<TenantRow | null> {
  try {
    const supabase = createPublicAdminClient();
    const { data, error } = await supabase.rpc("resolve_tenant_by_domain", {
      p_domain: domain,
    });

    if (error || !data?.length) return null;
    const row = data[0] as { tenant_id: string };
    return getTenantById(row.tenant_id);
  } catch {
    return null;
  }
}

/**
 * Get the owner's notification email for a tenant.
 * Returns null if tenant not found or no owner_email set.
 */
export async function getTenantOwnerEmail(tenantId: string): Promise<string | null> {
  if (!tenantId) return null;
  try {
    const tenant = await getTenantById(tenantId);
    return tenant?.owner_email ?? null;
  } catch {
    return null;
  }
}

/**
 * Get the pension display name for a tenant.
 * Falls back to NEXT_PUBLIC_PENSION_NAME env var.
 */
export async function getTenantDisplayName(tenantId: string): Promise<string> {
  if (!tenantId) return platformPensionNameFallback();
  try {
    const tenant = await getTenantById(tenantId);
    if (tenant?.display_name) return tenant.display_name;
  } catch {
    /* fall through */
  }
  return platformPensionNameFallback();
}

/**
 * Get ALL emails that should receive notifications for a tenant.
 * Returns owner + all active admin members.
 */
export async function getTenantNotificationEmails(
  tenantId: string
): Promise<string[]> {
  if (!tenantId) return [];

  const emails = new Set<string>();

  try {
    const supabase = createPublicAdminClient();
    const tenant = await getTenantById(tenantId);
    if (tenant?.owner_email) emails.add(tenant.owner_email);

    const { data: members } = await supabase
      .from("tenant_members")
      .select("email, role")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .in("role", ["owner", "admin"]);

    for (const m of members ?? []) {
      if (m.email) emails.add(m.email);
    }
  } catch {
    /* DB unavailable */
  }

  return Array.from(emails);
}
