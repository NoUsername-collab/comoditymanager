"use server";

import { createPublicAdminClient } from "@/lib/supabase/admin";
import { buildTenantLoginUrl } from "@/lib/tenant/host";
import { getTranslations } from "next-intl/server";
import {
  checkRateLimit,
  getClientIp,
} from "@/lib/rate-limit";

const RATE_LIMIT_SIGNUP = { limit: 5, windowMs: 60 * 60 * 1000 };

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function validateSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug);
}

export type SignupResult =
  | {
      ok: true;
      redirectTo: string;
      tenantId: string;
      slug: string;
      email: string;
      pensionName: string;
    }
  | { ok: false; error: string; field?: string; errorCode?: string };

function mapSignupFailure(
  t: Awaited<ReturnType<typeof getTranslations<"signup">>>,
  source: "auth" | "rpc" | "config",
  message: string
): { error: string; errorCode: string; field?: string } {
  const msg = message.toLowerCase();

  if (source === "config") {
    return { error: t("errorServerConfig"), errorCode: "server_config" };
  }

  if (source === "auth") {
    if (msg.includes("already")) {
      return {
        error: t("emailAlreadyRegistered"),
        errorCode: "email_taken",
        field: "email",
      };
    }
    if (msg.includes("invalid") && msg.includes("email")) {
      return {
        error: t("invalidEmail"),
        errorCode: "invalid_email",
        field: "email",
      };
    }
    if (msg.includes("password")) {
      return {
        error: t("passwordMinLength"),
        errorCode: "invalid_password",
        field: "password",
      };
    }
  }

  if (msg.includes("room_option_definitions_slug_key") || msg.includes("room_type_definitions_slug_key")) {
    return { error: t("errorCatalogMigration"), errorCode: "catalog_slug" };
  }
  if (msg.includes("tenants_plan_id_check") || msg.includes("plan_id")) {
    return { error: t("errorPlanConfig"), errorCode: "plan_config" };
  }
  if (msg.includes("duplicate") && msg.includes("slug")) {
    return {
      error: t("slugTaken"),
      errorCode: "slug_taken",
      field: "pension_name",
    };
  }
  if (msg.includes("invalid tenant slug")) {
    return {
      error: t("invalidPensionName"),
      errorCode: "invalid_slug",
      field: "pension_name",
    };
  }
  if (msg.includes("onboard_new_tenant") && msg.includes("does not exist")) {
    return { error: t("errorDatabase"), errorCode: "missing_rpc" };
  }
  if (
    msg.includes("permission denied") ||
    msg.includes("service_role") ||
    msg.includes("invalid api key")
  ) {
    return { error: t("errorServerConfig"), errorCode: "server_config" };
  }

  return { error: t("errorDatabase"), errorCode: "database" };
}

export async function signupAction(formData: FormData): Promise<SignupResult> {
  const t = await getTranslations("signup");

  let supabase;
  try {
    supabase = createPublicAdminClient();
  } catch (err) {
    console.error("[SIGNUP] Config error:", err);
    const mapped = mapSignupFailure(t, "config", String(err));
    return {
      ok: false,
      error: mapped.error,
      errorCode: mapped.errorCode,
    };
  }

  const ip = await getClientIp();
  const rl = checkRateLimit(
    `signup:${ip}`,
    RATE_LIMIT_SIGNUP.limit,
    RATE_LIMIT_SIGNUP.windowMs
  );
  if (!rl.allowed) {
    return { ok: false, error: t("rateLimited"), errorCode: "rate_limit" };
  }

  const pensionName = String(formData.get("pension_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const locale = String(formData.get("locale") ?? "ro");
  const country = String(formData.get("country") ?? "RO");

  if (!pensionName || pensionName.length < 2) {
    return {
      ok: false,
      error: t("pensionNameRequired"),
      field: "pension_name",
      errorCode: "validation",
    };
  }
  if (pensionName.length > 100) {
    return {
      ok: false,
      error: t("pensionNameTooLong"),
      field: "pension_name",
      errorCode: "validation",
    };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      ok: false,
      error: t("invalidEmail"),
      field: "email",
      errorCode: "validation",
    };
  }
  if (!password || password.length < 8) {
    return {
      ok: false,
      error: t("passwordMinLength"),
      field: "password",
      errorCode: "validation",
    };
  }

  let slug = slugify(pensionName);
  if (!validateSlug(slug)) {
    slug = slugify(`${email.split("@")[0]}-pension`);
  }
  if (!validateSlug(slug)) {
    return {
      ok: false,
      error: t("invalidPensionName"),
      field: "pension_name",
      errorCode: "validation",
    };
  }

  const { data: existingTenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingTenant) {
    const suffix = Math.random().toString(36).slice(2, 6);
    slug = `${slug}-${suffix}`;
    if (!validateSlug(slug)) {
      return {
        ok: false,
        error: t("slugTaken"),
        field: "pension_name",
        errorCode: "slug_taken",
      };
    }
  }

  const { data: userByEmail } = await supabase
    .from("tenant_members")
    .select("id")
    .eq("email", email)
    .eq("role", "owner")
    .maybeSingle();

  if (userByEmail) {
    return {
      ok: false,
      error: t("emailAlreadyRegistered"),
      field: "email",
      errorCode: "email_taken",
    };
  }

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "owner" },
    });

  if (authError || !authData.user) {
    console.error("[SIGNUP] Auth error:", authError?.message ?? "no user");
    const mapped = mapSignupFailure(
      t,
      "auth",
      authError?.message ?? "auth failed"
    );
    return {
      ok: false,
      error: mapped.error,
      field: mapped.field,
      errorCode: mapped.errorCode,
    };
  }

  const userId = authData.user.id;

  const timezoneMap: Record<string, string> = {
    RO: "Europe/Bucharest",
    MD: "Europe/Chisinau",
    BG: "Europe/Sofia",
  };

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

  if (rpcError || !tenantId) {
    console.error("[SIGNUP] RPC error:", rpcError?.message ?? "empty tenant id");
    await supabase.auth.admin.deleteUser(userId).catch(() => {});
    const mapped = mapSignupFailure(
      t,
      "rpc",
      rpcError?.message ?? "empty tenant id"
    );
    return {
      ok: false,
      error: mapped.error,
      field: mapped.field,
      errorCode: mapped.errorCode,
    };
  }

  return {
    ok: true,
    tenantId: String(tenantId),
    slug,
    email,
    pensionName,
    redirectTo: buildTenantLoginUrl(slug, {
      signup: "1",
      email,
    }),
  };
}
