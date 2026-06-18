import type { SupabaseClient } from "@supabase/supabase-js";
import { getMfaAccessState } from "@/lib/auth/mfa-session";
import type { TenantMemberRole } from "@/services/tenant-members";

export async function resolveMfaRedirectPath(
  supabase: SupabaseClient,
  opts: {
    email?: string | null;
    memberRole?: TenantMemberRole | null;
    next?: string;
  }
): Promise<string | null> {
  const mfaState = await getMfaAccessState(supabase, opts);

  const safeNext =
    opts.next &&
    opts.next.startsWith("/") &&
    !opts.next.startsWith("//") &&
    !opts.next.includes("://")
      ? opts.next
      : "/admin";

  if (mfaState.kind === "needs_enrollment") {
    return `/admin/security/mfa?next=${encodeURIComponent(safeNext)}`;
  }

  if (mfaState.kind === "needs_challenge") {
    return `/admin/login?next=${encodeURIComponent(safeNext)}`;
  }

  return null;
}
