"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { localeRedirect as localeRedirectInternal } from "@/i18n/server-redirect";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isValidLoginIdentifier,
  resolveLoginIdentifier,
} from "@/lib/auth/constants";
import { resolveStaffRole } from "@/lib/auth/tenant-staff";
import { isPlatformAdminEmail } from "@/lib/auth/require-platform-admin";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { buildTenantAdminUrl } from "@/lib/tenant/host";
import { withTenantId } from "@/lib/tenant/scope";
import { getPrimaryTenantSlugForUser } from "@/services/tenant-members";
import { getMfaAccessState } from "@/lib/auth/mfa-session";
import { getTenantMemberRole } from "@/services/tenant-members";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMIT_LOGIN,
} from "@/lib/rate-limit";
import { getTranslations } from "next-intl/server";

export type LoginFormState = {
  error: string | null;
  mfaRequired?: boolean;
};

async function finalizeStaffLogin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string | null },
  next: string,
  tenant: Awaited<ReturnType<typeof resolveRequestTenant>>,
  role: Awaited<ReturnType<typeof resolveStaffRole>>
): Promise<never> {
  const t = await getTranslations("admin.serverActions");
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") && !next.includes("://")
      ? next
      : "/admin";

  const loginSummary = t("loginSummary", { role: role ?? "staff" });

  if (
    !tenant &&
    safeNext.startsWith("/hospira-admin") &&
    user.email &&
    isPlatformAdminEmail(user.email)
  ) {
    await logLoginActivity(undefined, user, loginSummary);
    redirect(safeNext);
  }

  let platformSlug: string | null = null;
  if (!tenant) {
    platformSlug = await getPrimaryTenantSlugForUser(
      supabase,
      user.id,
      user.email
    );
    if (!platformSlug) {
      await supabase.auth.signOut();
      redirect("/admin/login?error=no_tenant");
    }
  }

  await logLoginActivity(tenant?.id, user, loginSummary);

  if (tenant) {
    await localeRedirectInternal(safeNext);
  }

  if (platformSlug) {
    const requestHost =
      (await headers()).get("x-forwarded-host") ??
      (await headers()).get("host");
    redirect(buildTenantAdminUrl(platformSlug, safeNext, requestHost));
  }

  await supabase.auth.signOut();
  redirect("/admin/login?error=no_tenant");
}

async function logLoginActivity(
  tenantId: string | undefined,
  user: { id: string; email?: string | null },
  summary: string
): Promise<void> {
  if (!tenantId) return;
  try {
    const supabase = await createAdminClient();
    await supabase.from("admin_activity_log").insert(
      withTenantId(tenantId, {
        actor_id: user.id,
        actor_email: user.email ?? null,
        action: "auth.login",
        entity_type: "session",
        entity_id: user.id,
        summary: summary.slice(0, 500),
        metadata: {},
        undoable: false,
        reverts_log_id: null,
      })
    );
  } catch (e) {
    console.error("[login] activity log", e);
  }
}

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const t = await getTranslations("admin.serverActions");
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!isValidLoginIdentifier(username)) {
    return { error: t("invalidUser") };
  }
  if (!password) {
    return { error: t("enterPassword") };
  }

  const ip = await getClientIp();
  const rl = checkRateLimit(
    `login:${ip}`,
    RATE_LIMIT_LOGIN.limit,
    RATE_LIMIT_LOGIN.windowMs,
  );
  if (!rl.allowed) {
    return { error: t("rateLimited") };
  }

  const email = resolveLoginIdentifier(username);
  if (!email) {
    return { error: t("invalidUser") };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: t("invalidUserOrPassword") };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t("invalidUserOrPassword") };
  }

  const tenant = await resolveRequestTenant();
  const role = await resolveStaffRole(user);

  if (tenant && !role) {
    await supabase.auth.signOut();
    return { error: t("notMemberOfPension") };
  }

  const memberRole = tenant
    ? await getTenantMemberRole(tenant.id, user.id)
    : null;

  const mfaState = await getMfaAccessState(supabase, {
    email: user.email,
    memberRole,
  });

  const safeNext =
    next.startsWith("/") && !next.startsWith("//") && !next.includes("://")
      ? next
      : "/admin";

  if (mfaState.kind === "needs_challenge") {
    return { error: null, mfaRequired: true };
  }

  return finalizeStaffLogin(supabase, user, safeNext, tenant, role);
}

export async function completeLoginAfterMfaAction(next: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const tenant = await resolveRequestTenant();
  const role = await resolveStaffRole(user);

  if (tenant && !role) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=unauthorized");
  }

  const mfaState = await getMfaAccessState(supabase, {
    email: user.email,
    memberRole: tenant ? await getTenantMemberRole(tenant.id, user.id) : null,
  });

  if (mfaState.kind !== "ok") {
    redirect("/admin/login");
  }

  await finalizeStaffLogin(supabase, user, next, tenant, role);
}

export async function logoutAction() {
  const t = await getTranslations("admin.serverActions");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenant = await resolveRequestTenant();
  if (user) {
    try {
      const supabaseAdmin = await createAdminClient();
      if (tenant) {
        await supabaseAdmin.from("admin_activity_log").insert(
          withTenantId(tenant.id, {
            actor_id: user.id,
            actor_email: user.email ?? null,
            action: "auth.logout",
            entity_type: "session",
            entity_id: user.id,
            summary: t("adminLogout").slice(0, 500),
            metadata: {},
            undoable: false,
            reverts_log_id: null,
          })
        );
      }
    } catch (e) {
      console.error("[logout] activity log", e);
    }
  }
  await supabase.auth.signOut();
  redirect("/");
}
