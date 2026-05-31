"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { localeRedirect as localeRedirectInternal } from "@/i18n/server-redirect";
import { createClient } from "@/lib/supabase/server";
import {
  isValidLoginIdentifier,
  resolveLoginIdentifier,
} from "@/lib/auth/constants";
import { resolveStaffRole } from "@/lib/auth/tenant-staff";
import { logAdminActivity } from "@/services/activity-log";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { buildTenantAdminUrl } from "@/lib/tenant/host";
import { getPrimaryTenantSlugForUser } from "@/services/tenant-members";
import { getTranslations } from "next-intl/server";

export async function loginAction(formData: FormData) {
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

  const safeNext =
    next.startsWith("/") && !next.startsWith("//") && !next.includes("://")
      ? next
      : "/admin";

  // Platform host: owner/staff may lack app_metadata.role but have tenant_members
  let platformSlug: string | null = null;
  if (!tenant) {
    platformSlug = await getPrimaryTenantSlugForUser(supabase, user.id);
    if (!platformSlug && !role) {
      await supabase.auth.signOut();
      return { error: t("noTenantLinked") };
    }
  }

  await logAdminActivity({
    action: "auth.login",
    entityType: "session",
    entityId: user.id,
    summary: t("loginSummary", { role: role ?? "staff" }),
    actor: { id: user.id, email: user.email },
  });

  // Already on tenant host (slug.hospira.ro) — stay on same domain
  if (tenant) {
    await localeRedirectInternal(safeNext);
    return;
  }

  // Platform login (test.hospira.ro) → admin lives on tenant subdomain
  if (platformSlug) {
    const requestHost =
      (await headers()).get("x-forwarded-host") ??
      (await headers()).get("host");
    redirect(buildTenantAdminUrl(platformSlug, safeNext, requestHost));
  }

  await supabase.auth.signOut();
  return { error: t("noTenantLinked") };
}

export async function logoutAction() {
  const t = await getTranslations("admin.serverActions");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await logAdminActivity({
      action: "auth.logout",
      entityType: "session",
      entityId: user.id,
      summary: t("adminLogout"),
      actor: { id: user.id, email: user.email },
    });
  }
  await supabase.auth.signOut();
  await redirect("/");
}
