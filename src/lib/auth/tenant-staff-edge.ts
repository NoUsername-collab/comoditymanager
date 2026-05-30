import type { StaffRole } from "@/lib/auth/roles";

type TenantMemberRole = "owner" | "admin" | "operator";

function tenantMemberRoleToStaffRole(role: TenantMemberRole): StaffRole {
  if (role === "operator") return "operator";
  return "admin";
}

type TenantHostRef =
  | { slug: string; customDomain?: undefined }
  | { slug?: undefined; customDomain: string };

function edgeSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

async function supabaseRpc<T>(
  fn: string,
  args: Record<string, unknown>
): Promise<T | null> {
  const cfg = edgeSupabaseConfig();
  if (!cfg) return null;

  const res = await fetch(`${cfg.url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });

  if (!res.ok) return null;
  return (await res.json()) as T;
}

async function resolveTenantIdOnEdge(ref: TenantHostRef): Promise<string | null> {
  if (ref.slug) {
    const rows = await supabaseRpc<{ tenant_id: string }[]>(
      "resolve_tenant_by_slug",
      { p_slug: ref.slug }
    );
    return rows?.[0]?.tenant_id ?? null;
  }

  const rows = await supabaseRpc<{ tenant_id: string }[]>(
    "resolve_tenant_by_domain",
    { p_domain: ref.customDomain }
  );
  return rows?.[0]?.tenant_id ?? null;
}

async function getTenantMemberRoleOnEdge(
  tenantId: string,
  userId: string
): Promise<TenantMemberRole | null> {
  const role = await supabaseRpc<string | null>("get_tenant_member_role", {
    p_tenant_id: tenantId,
    p_user_id: userId,
  });
  if (role === "owner" || role === "admin" || role === "operator") {
    return role;
  }
  return null;
}

/** Staff role for tenant subdomain/custom domain (Edge proxy). */
export async function resolveStaffRoleOnTenantHost(
  userId: string,
  ref: TenantHostRef
): Promise<StaffRole | null> {
  const tenantId = await resolveTenantIdOnEdge(ref);
  if (!tenantId) return null;

  const memberRole = await getTenantMemberRoleOnEdge(tenantId, userId);
  if (!memberRole) return null;

  return tenantMemberRoleToStaffRole(memberRole);
}
