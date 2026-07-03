"use server";

import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; error: string; field?: string };

export async function resetPasswordAction(
  formData: FormData
): Promise<ResetPasswordResult> {
  const t = await getTranslations("admin.resetPassword");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { ok: false, error: t("passwordTooShort"), field: "password" };
  }
  if (password !== confirm) {
    return { ok: false, error: t("passwordMismatch"), field: "confirm" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (
      error.message.toLowerCase().includes("session") ||
      error.message.toLowerCase().includes("token") ||
      error.message.toLowerCase().includes("expired")
    ) {
      return { ok: false, error: t("invalidToken") };
    }
    return { ok: false, error: t("genericError") };
  }

  return { ok: true };
}
