"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isKnownStaffUsername,
  resolveStaffEmail,
} from "@/lib/auth/constants";
import { getStaffRole } from "@/lib/auth/roles";
import { logAdminActivity } from "@/services/activity-log";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!isKnownStaffUsername(username)) {
    return { error: "Utilizator invalid" };
  }
  if (!password) {
    return { error: "Introdu parola" };
  }

  const email = resolveStaffEmail(username);
  if (!email) {
    return { error: "Utilizator invalid" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Utilizator sau parolă greșită" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await logAdminActivity({
      action: "auth.login",
      entityType: "session",
      entityId: user.id,
      summary: `Autentificare ${getStaffRole(user) ?? "staff"}`,
      actor: { id: user.id, email: user.email },
    });
  }

  const safeNext =
    next.startsWith("/") && !next.startsWith("//") && !next.includes("://")
      ? next
      : "/admin";
  redirect(safeNext);
}

export async function logoutAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await logAdminActivity({
      action: "auth.logout",
      entityType: "session",
      entityId: user.id,
      summary: "Deconectare admin",
      actor: { id: user.id, email: user.email },
    });
  }
  await supabase.auth.signOut();
  redirect("/");
}
