"use server";

import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export type ForgotPasswordResult =
  | { ok: true }
  | { ok: false; error: string };

export async function forgotPasswordAction(
  formData: FormData
): Promise<ForgotPasswordResult> {
  const t = await getTranslations("admin.forgotPassword");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: t("invalidEmail") };
  }

  const ip = await getClientIp();
  const rl = checkRateLimit(`forgot-pw:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    return { ok: false, error: t("genericError") };
  }

  const requestHost =
    (await headers()).get("x-forwarded-host") ??
    (await headers()).get("host") ??
    "localhost:3000";
  const protocol = requestHost.includes("localhost") ? "http" : "https";
  const redirectTo = `${protocol}://${requestHost}/api/auth/callback?type=recovery`;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  // Always return ok to avoid email enumeration
  return { ok: true };
}
