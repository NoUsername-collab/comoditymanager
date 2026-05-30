"use server";

import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { getTranslations } from "next-intl/server";
import {
  checkRateLimit,
  getClientIp,
} from "@/lib/rate-limit";

const RATE_LIMIT_SIGNUP = { limit: 5, windowMs: 60 * 60 * 1000 }; // 5 per hour

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")    // non-alphanum → dash
    .replace(/^-+|-+$/g, "")        // trim dashes
    .slice(0, 50);
}

function validateSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug);
}

type SignupResult =
  | { ok: true; tenantId: string }
  | { ok: false; error: string; field?: string };

export async function signupAction(formData: FormData): Promise<SignupResult> {
  const t = await getTranslations("signup");

  // Rate limit
  const ip = await getClientIp();
  const rl = checkRateLimit(`signup:${ip}`, RATE_LIMIT_SIGNUP.limit, RATE_LIMIT_SIGNUP.windowMs);
  if (!rl.allowed) {
    return { ok: false, error: t("rateLimited") };
  }

  // Read form
  const pensionName = String(formData.get("pension_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const locale = String(formData.get("locale") ?? "ro");
  const country = String(formData.get("country") ?? "RO");

  // Validate
  if (!pensionName || pensionName.length < 2) {
    return { ok: false, error: t("pensionNameRequired"), field: "pension_name" };
  }
  if (pensionName.length > 100) {
    return { ok: false, error: t("pensionNameTooLong"), field: "pension_name" };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: t("invalidEmail"), field: "email" };
  }
  if (!password || password.length < 8) {
    return { ok: false, error: t("passwordMinLength"), field: "password" };
  }

  // Generate slug
  let slug = slugify(pensionName);
  if (!validateSlug(slug)) {
    // Fallback: use email prefix
    slug = slugify(email.split("@")[0] + "-pension");
  }
  if (!validateSlug(slug)) {
    return { ok: false, error: t("invalidPensionName"), field: "pension_name" };
  }

  const supabase = createPublicAdminClient();

  // Check slug uniqueness
  const { data: existingTenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingTenant) {
    // Append random suffix
    const suffix = Math.random().toString(36).slice(2, 6);
    slug = `${slug}-${suffix}`;
    if (!validateSlug(slug)) {
      return { ok: false, error: t("slugTaken"), field: "pension_name" };
    }
  }

  // Check email uniqueness
  const { data: existingUsers } = await supabase.auth.admin.listUsers({
    perPage: 1,
  });
  // More precise check via email
  const { data: userByEmail } = await supabase
    .from("tenant_members")
    .select("id")
    .eq("email", email)
    .eq("role", "owner")
    .maybeSingle();

  if (userByEmail) {
    return { ok: false, error: t("emailAlreadyRegistered"), field: "email" };
  }

  // Create Supabase Auth user
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "owner" },
    });

  if (authError) {
    if (authError.message.includes("already been registered") ||
        authError.message.includes("already exists")) {
      return { ok: false, error: t("emailAlreadyRegistered"), field: "email" };
    }
    console.error("[SIGNUP] Auth error:", authError.message);
    return { ok: false, error: t("genericError") };
  }

  const userId = authData.user.id;

  // Determine timezone from country
  const timezoneMap: Record<string, string> = {
    RO: "Europe/Bucharest",
    MD: "Europe/Chisinau",
    BG: "Europe/Sofia",
  };

  // Call onboard_new_tenant RPC
  const { data: tenantId, error: rpcError } = await supabase.rpc(
    "onboard_new_tenant",
    {
      p_slug: slug,
      p_display_name: pensionName,
      p_owner_id: userId,
      p_owner_email: email,
      p_locale: locale,
      p_country: country,
      p_timezone: timezoneMap[country] ?? "Europe/Bucharest",
    }
  );

  if (rpcError) {
    console.error("[SIGNUP] RPC error:", rpcError.message);
    // Cleanup: delete the auth user we just created
    await supabase.auth.admin.deleteUser(userId).catch(() => {});
    return { ok: false, error: t("genericError") };
  }

  // Notify owner (non-blocking)
  (async () => {
    try {
      const { notifyOwnerNewRequest } = await import("@/lib/email/notify");
      // We could send a welcome email here in the future
    } catch { /* non-fatal */ }
  })();

  // Auto-login the new user
  // We can't use signInWithPassword from server action with service role client,
  // so we redirect to a special login page that auto-logs them in
  await redirect(`/admin/login?signup=1&email=${encodeURIComponent(email)}`);

  // This won't be reached due to redirect, but TypeScript needs it
  return { ok: true, tenantId: tenantId as string };
}
