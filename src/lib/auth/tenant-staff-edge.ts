import type { SupabaseClient } from "@supabase/supabase-js";
import type { StaffRole } from "@/lib/auth/roles";

type TenantMemberRole = "owner" | "admin" | "operator";

function tenantMemberRoleToStaffRole(role: TenantMemberRole): StaffRole {
  if (role === "operator") return "operator";
  return "admin";
}

type TenantHostRef =
  | { slug: string; customDomain?: undefined }
  | { slug?: undefined; customDomain: string };

function edgeAnonConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

function edgeServiceConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

async function supabaseRpc<T>(
  fn: string,
  args: Record<string, unknown>,
  authKey: string
): Promise<T | null> {
  const cfg = edgeAnonConfig();
  if (!cfg) return null;

  const res = await fetch(`${cfg.url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.key,
      Authorization: `Bearer ${authKey}`,
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });

  if (!res.ok) return null;
  return (await res.json()) as T;
}

export async function resolveTenantIdOnEdge(ref: TenantHostRef): Promise<string | null> {
  const anon = edgeAnonConfig();
  if (!anon) return null;

  if (ref.slug) {
    const rows = await supabaseRpc<{ tenant_id: string }[]>(
      "resolve_tenant_by_slug",
      { p_slug: ref.slug },
      anon.key
    );
    return rows?.[0]?.tenant_id ?? null;
  }

  const rows = await supabaseRpc<{ tenant_id: string }[]>(
    "resolve_tenant_by_domain",
    { p_domain: ref.customDomain },
    anon.key
  );
  return rows?.[0]?.tenant_id ?? null;
}

async function getTenantMemberRoleViaSession(
  sessionClient: SupabaseClient,
  tenantId: string,
  userId: string
): Promise<TenantMemberRole | null> {
  const { data, error } = await sessionClient
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data?.role) return null;
  const role = data.role as string;
  if (role === "owner" || role === "admin" || role === "operator") {
    return role;
  }
  return null;
}

async function getTenantMemberRoleOnEdge(
  tenantId: string,
  userId: string
): Promise<TenantMemberRole | null> {
  const service = edgeServiceConfig();
  if (!service) return null;

  const role = await supabaseRpc<string | null>(
    "get_tenant_member_role",
    { p_tenant_id: tenantId, p_user_id: userId },
    service.key
  );
  if (role === "owner" || role === "admin" || role === "operator") {
    return role;
  }
  return null;
}

export async function resolveTenantMemberRoleOnTenantHost(
  userId: string,
  ref: TenantHostRef,
  sessionClient?: SupabaseClient
): Promise<TenantMemberRole | null> {
  const tenantId = await resolveTenantIdOnEdge(ref);
  if (!tenantId) return null;

  if (sessionClient) {
    const sessionRole = await getTenantMemberRoleViaSession(
      sessionClient,
      tenantId,
      userId
    );
    if (sessionRole) return sessionRole;
  }

  return getTenantMemberRoleOnEdge(tenantId, userId);
}

/** Staff role for tenant subdomain/custom domain (Edge proxy). */
export async function resolveStaffRoleOnTenantHost(
  userId: string,
  ref: TenantHostRef,
  sessionClient?: SupabaseClient
): Promise<StaffRole | null> {
  const tenantId = await resolveTenantIdOnEdge(ref);
  if (!tenantId) return null;

  if (sessionClient) {
    const sessionRole = await getTenantMemberRoleViaSession(
      sessionClient,
      tenantId,
      userId
    );
    if (sessionRole) return tenantMemberRoleToStaffRole(sessionRole);
  }

  const memberRole = await getTenantMemberRoleOnEdge(tenantId, userId);
  if (!memberRole) return null;

  return tenantMemberRoleToStaffRole(memberRole);
}
