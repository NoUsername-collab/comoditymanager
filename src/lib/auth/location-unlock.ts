import type { User } from "@supabase/supabase-js";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getAdminEmail } from "@/lib/auth/constants";
import { isAdminLocationUnlocked } from "@/lib/auth/admin-config-session";
import { resolveRequestTenant } from "@/lib/tenant/active";
import {
  getTenantMemberRole,
  type TenantMemberRole,
} from "@/services/tenant-members";

/** Verifică parola unui cont Supabase fără a schimba sesiunea curentă. */
export async function verifyPasswordForEmail(
  email: string,
  password: string
): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const normalized = email.trim().toLowerCase();
  if (!url || !key || !normalized || !password) return false;

  const client = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await client.auth.signInWithPassword({
    email: normalized,
    password,
  });

  return !error;
}

/**
 * Deblocare administrare locație:
 * - owner → propria parolă (reconfirmare)
 * - admin staff → parola owner-ului pensiunii
 */
export async function verifyLocationUnlockPassword(
  password: string,
  user: User
): Promise<boolean> {
  const tenant = await resolveRequestTenant();

  if (!tenant) {
    return verifyPasswordForEmail(getAdminEmail(), password);
  }

  const memberRole = await getTenantMemberRole(tenant.id, user.id);
  const email =
    memberRole === "owner"
      ? user.email
      : tenant.owner_email;

  if (!email) return false;
  return verifyPasswordForEmail(email, password);
}

export async function getTenantMemberRoleForRequest(
  userId: string
): Promise<TenantMemberRole | null> {
  const tenant = await resolveRequestTenant();
  if (!tenant) return null;
  return getTenantMemberRole(tenant.id, userId);
}

/** Owner: acces permanent. Staff admin: necesită unlock 2h. */
export async function isLocationConfigurationAccessible(
  userId: string
): Promise<boolean> {
  const memberRole = await getTenantMemberRoleForRequest(userId);
  if (memberRole === "owner") return true;
  return isAdminLocationUnlocked();
}
