/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  REZOVA — Tenant Service                                       ║
 * ║                                                                ║
 * ║  Reads tenant info from the `tenants` table.                   ║
 * ║  Fallback to env vars for backward compatibility.              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { createPublicAdminClient } from "@/lib/supabase/admin";

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
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Get the default tenant (first tenant in DB — Casa Emil for now).
 * In multi-tenant mode, this will be resolved from the request domain/slug.
 */
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

/** Lookup by URL slug (casa-emil.hospira.ro → casa-emil). */
export async function getTenantBySlug(slug: string): Promise<TenantRow | null> {
  try {
    const supabase = createPublicAdminClient();
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("slug", slug)
      .in("status", ["active", "trial"])
      .maybeSingle();

    if (error || !data) return null;
    return data as TenantRow;
  } catch {
    return null;
  }
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
 * Falls back to ADMIN_EMAIL env var, then to null.
 */
export async function getTenantOwnerEmail(
  tenantId?: string
): Promise<string | null> {
  try {
    if (tenantId) {
      const tenant = await getTenantById(tenantId);
      if (tenant?.owner_email) return tenant.owner_email;
    }

    // No tenantId — get default tenant
    const tenant = await getDefaultTenant();
    if (tenant?.owner_email) return tenant.owner_email;
  } catch {
    // DB unavailable — fall through to env var
  }

  // Fallback: env var (backward compatibility)
  return process.env.ADMIN_EMAIL?.trim() || null;
}

/**
 * Get the pension display name for a tenant.
 * Falls back to NEXT_PUBLIC_PENSION_NAME env var.
 */
export async function getTenantDisplayName(
  tenantId?: string
): Promise<string> {
  try {
    if (tenantId) {
      const tenant = await getTenantById(tenantId);
      if (tenant?.display_name) return tenant.display_name;
    }

    const tenant = await getDefaultTenant();
    if (tenant?.display_name) return tenant.display_name;
  } catch {
    // DB unavailable — fall through to env var
  }

  return process.env.NEXT_PUBLIC_PENSION_NAME ?? "Rezova";
}

/**
 * Get ALL emails that should receive notifications for a tenant.
 * Returns owner + all active admin members.
 */
export async function getTenantNotificationEmails(
  tenantId?: string
): Promise<string[]> {
  const emails = new Set<string>();

  try {
    const supabase = createPublicAdminClient();

    // Resolve tenant
    let resolvedTenantId = tenantId;
    if (!resolvedTenantId) {
      const tenant = await getDefaultTenant();
      resolvedTenantId = tenant?.id;
      if (tenant?.owner_email) emails.add(tenant.owner_email);
    } else {
      const tenant = await getTenantById(resolvedTenantId);
      if (tenant?.owner_email) emails.add(tenant.owner_email);
    }

    // Also get admin-role members who should receive notifications
    if (resolvedTenantId) {
      const { data: members } = await supabase
        .from("tenant_members")
        .select("email, role")
        .eq("tenant_id", resolvedTenantId)
        .eq("is_active", true)
        .in("role", ["owner", "admin"]);

      if (members) {
        for (const m of members) {
          if (m.email) emails.add(m.email);
        }
      }
    }
  } catch {
    // DB unavailable
  }

  // Fallback
  if (emails.size === 0) {
    const env = process.env.ADMIN_EMAIL?.trim();
    if (env) emails.add(env);
  }

  return Array.from(emails);
}
