import { headers } from "next/headers";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import type { PlanId } from "@/core/config/plans";
import { platformDomainFromRequestHost } from "@/lib/tenant/host";
import {
  isValidTenantSlug,
  slugifyTenantName,
} from "@/lib/platform-admin/tenant-slug";

export type ProvisionTenantInput = {
  displayName: string;
  slug: string;
  ownerEmail: string;
  ownerPassword: string;
  locale: "ro" | "en" | "bg";
  country: "RO" | "MD" | "BG";
  planId?: PlanId;
};

const TIMEZONE_BY_COUNTRY: Record<string, string> = {
  RO: "Europe/Bucharest",
  MD: "Europe/Chisinau",
  BG: "Europe/Sofia",
};

export async function provisionPlatformTenant(
  input: ProvisionTenantInput
): Promise<{ tenantId: string; slug: string }> {
  const displayName = input.displayName.trim();
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const ownerPassword = input.ownerPassword;
  let slug = input.slug.trim().toLowerCase();

  if (!displayName || displayName.length < 2) {
    throw new Error("Numele proprietatii este obligatoriu.");
  }
  if (!ownerEmail || !ownerEmail.includes("@")) {
    throw new Error("Email proprietar invalid.");
  }
  if (!ownerPassword || ownerPassword.length < 8) {
    throw new Error("Parola trebuie sa aiba minim 8 caractere.");
  }

  if (!slug) {
    slug = slugifyTenantName(displayName);
  }
  if (!isValidTenantSlug(slug)) {
    throw new Error("Slug invalid (2-50 caractere, litere mici, cifre, cratime).");
  }

  const supabase = createPublicAdminClient();

  const { data: existingTenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingTenant) {
    throw new Error("Slug-ul este deja folosit.");
  }

  const { data: emailStatus, error: emailStatusError } = await supabase.rpc(
    "check_owner_email_for_signup",
    { p_email: ownerEmail }
  );

  if (!emailStatusError && emailStatus === "login_required") {
    throw new Error("Email-ul este deja inregistrat.");
  }

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      app_metadata: { role: "owner" },
    });

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? "Creare utilizator esuata.");
  }

  const userId = authData.user.id;
  const requestHost =
    (await headers()).get("x-forwarded-host") ??
    (await headers()).get("host");

  const { data: tenantId, error: rpcError } = await supabase.rpc(
    "onboard_new_tenant",
    {
      p_slug: slug,
      p_display_name: displayName,
      p_owner_id: userId,
      p_owner_email: ownerEmail,
      p_locale: input.locale,
      p_country: input.country,
      p_timezone: TIMEZONE_BY_COUNTRY[input.country] ?? "Europe/Bucharest",
      p_platform_domain: platformDomainFromRequestHost(requestHost),
    }
  );

  if (rpcError || !tenantId) {
    await supabase.auth.admin.deleteUser(userId).catch(() => {});
    throw new Error(rpcError?.message ?? "Onboarding esuat.");
  }

  if (input.planId && input.planId !== "free") {
    const { error: planError } = await supabase
      .from("tenants")
      .update({
        plan_id: input.planId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", String(tenantId));

    if (planError) {
      throw new Error(planError.message);
    }
  }

  return { tenantId: String(tenantId), slug };
}