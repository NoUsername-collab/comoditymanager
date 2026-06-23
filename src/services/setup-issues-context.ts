import { cache } from "react";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";

export type OnboardingIssueContext = {
  displayName: string | null;
  rawPaletteKey: string | null;
  appearanceSaved: boolean;
  pensionEmail: string | null;
  publicSiteEmail: string | null;
  usePrimaryContact: boolean;
  emailReplyTo: string | null;
  emailFromName: string | null;
  emailFromAddress: string | null;
};

async function hasAppearanceBeenSaved(tenantId: string): Promise<boolean> {
  const supabase = createPublicAdminClient();
  const { count, error } = await supabase
    .from("admin_activity_log")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("action", "settings.appearance_updated");

  if (error) return false;
  return (count ?? 0) > 0;
}

async function loadOnboardingIssueContextUncached(
  tenantId: string,
): Promise<OnboardingIssueContext> {
  const supabase = createPublicAdminClient();

  const [pensionResult, publicSiteResult, appearanceSaved] = await Promise.all([
    supabase
      .from("pension_settings")
      .select(
        "admin_palette_key, contact_email, display_name, email_reply_to, email_from_name, email_from_address",
      )
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .from("public_site_settings")
      .select("contact, use_primary_contact")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    hasAppearanceBeenSaved(tenantId),
  ]);

  const pensionRow = pensionResult.data;
  const publicSiteRow = publicSiteResult.data;
  const publicContact =
    publicSiteRow?.contact && typeof publicSiteRow.contact === "object"
      ? (publicSiteRow.contact as { email?: string | null })
      : null;

  return {
    displayName:
      typeof pensionRow?.display_name === "string" ? pensionRow.display_name : null,
    rawPaletteKey:
      typeof pensionRow?.admin_palette_key === "string"
        ? pensionRow.admin_palette_key
        : null,
    appearanceSaved,
    pensionEmail:
      typeof pensionRow?.contact_email === "string" ? pensionRow.contact_email : null,
    publicSiteEmail:
      typeof publicContact?.email === "string" ? publicContact.email : null,
    usePrimaryContact: publicSiteRow?.use_primary_contact !== false,
    emailReplyTo:
      typeof pensionRow?.email_reply_to === "string" ? pensionRow.email_reply_to : null,
    emailFromName:
      typeof pensionRow?.email_from_name === "string" ? pensionRow.email_from_name : null,
    emailFromAddress:
      typeof pensionRow?.email_from_address === "string"
        ? pensionRow.email_from_address
        : null,
  };
}

const getCachedOnboardingIssueContext = (tenantId: string) =>
  unstable_cache(
    () => loadOnboardingIssueContextUncached(tenantId),
    ["setup-onboarding-context-progress", tenantId],
    {
      tags: [
        CACHE_TAGS.pensionSettings,
        CACHE_TAGS.publicSite,
        CACHE_TAGS.buildings,
        tenantTag(tenantId, CACHE_TAGS.pensionSettings),
      ],
      revalidate: 120,
    },
  );

export const loadOnboardingIssueContext = cache(async () => {
  const tenantId = await resolveTenantIdForData();
  return getCachedOnboardingIssueContext(tenantId)();
});
