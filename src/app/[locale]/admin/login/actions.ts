"use server";

import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { createClient } from "@/lib/supabase/server";
import {
  isKnownStaffUsername,
  resolveStaffEmail,
} from "@/lib/auth/constants";
import { getStaffRole } from "@/lib/auth/roles";
import { logAdminActivity } from "@/services/activity-log";
import { getTranslations } from "next-intl/server";

export async function loginAction(formData: FormData) {
  const t = await getTranslations("admin.serverActions");
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!isKnownStaffUsername(username)) {
    return { error: t("invalidUser") };
  }
  if (!password) {
    return { error: t("enterPassword") };
  }

  const email = resolveStaffEmail(username);
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
  if (user) {
    await logAdminActivity({
      action: "auth.login",
      entityType: "session",
      entityId: user.id,
      summary: t("loginSummary", { role: getStaffRole(user) ?? "staff" }),
      actor: { id: user.id, email: user.email },
    });
  }

  const safeNext =
    next.startsWith("/") && !next.startsWith("//") && !next.includes("://")
      ? next
      : "/admin";
  await redirect(safeNext);
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
