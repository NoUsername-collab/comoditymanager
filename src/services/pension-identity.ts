import { cache } from "react";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import {
  EMPTY_PENSION_CONTACT,
  type PensionContact,
  type PensionIdentity,
} from "@/domain/settings/pension-identity";
import { DEFAULT_PENSION_DISPLAY_NAME } from "@/lib/constants";

const IDENTITY_SELECT =
  "display_name, logo_url, contact_email, contact_phone, contact_whatsapp, contact_telegram, contact_facebook, contact_instagram";

const IDENTITY_SELECT_WITHOUT_LOGO =
  "display_name, contact_email, contact_phone, contact_whatsapp, contact_telegram, contact_facebook, contact_instagram";

function mapContact(row: Record<string, unknown>): PensionContact {
  const str = (key: string) => {
    const value = row[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  };

  return {
    email: str("contact_email"),
    phone: str("contact_phone"),
    whatsapp: str("contact_whatsapp"),
    telegram: str("contact_telegram"),
    facebook: str("contact_facebook"),
    instagram: str("contact_instagram"),
  };
}

function isIdentityMigrationMissing(message: string): boolean {
  return message.includes("contact_email");
}

function isLogoColumnMissing(message: string): boolean {
  return message.includes("logo_url");
}

function mapIdentity(
  row: Record<string, unknown> | null,
  logoUrl: string | null | undefined,
): PensionIdentity {
  return {
    displayName:
      typeof row?.display_name === "string" ? row.display_name : DEFAULT_PENSION_DISPLAY_NAME,
    logoUrl,
    contact: row ? mapContact(row) : { ...EMPTY_PENSION_CONTACT },
  };
}

async function loadPensionIdentityUncached(
  tenantId: string,
): Promise<PensionIdentity> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("pension_settings")
    .select(IDENTITY_SELECT)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    if (isLogoColumnMissing(error.message) && !isIdentityMigrationMissing(error.message)) {
      const retry = await supabase
        .from("pension_settings")
        .select(IDENTITY_SELECT_WITHOUT_LOGO)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (retry.error) {
        if (isIdentityMigrationMissing(retry.error.message)) {
          const fallback = await supabase
            .from("pension_settings")
            .select("display_name")
            .eq("tenant_id", tenantId)
            .maybeSingle();
          return {
            displayName:
              typeof fallback.data?.display_name === "string"
                ? fallback.data.display_name
                : DEFAULT_PENSION_DISPLAY_NAME,
            contact: { ...EMPTY_PENSION_CONTACT },
          };
        }
        throw new Error(retry.error.message);
      }
      return mapIdentity(retry.data, undefined);
    }
    if (isIdentityMigrationMissing(error.message)) {
      const fallback = await supabase
        .from("pension_settings")
        .select("display_name")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      return {
        displayName:
          typeof fallback.data?.display_name === "string"
            ? fallback.data.display_name
            : DEFAULT_PENSION_DISPLAY_NAME,
        contact: { ...EMPTY_PENSION_CONTACT },
      };
    }
    throw new Error(error.message);
  }

  const logoUrl =
    typeof data?.logo_url === "string" && data.logo_url.trim() ? data.logo_url.trim() : null;
  return mapIdentity(data, logoUrl);
}

const getCachedPensionIdentity = (tenantId: string) =>
  unstable_cache(
    () => loadPensionIdentityUncached(tenantId),
    ["pension-identity", tenantId],
    {
      tags: [CACHE_TAGS.pensionSettings, tenantTag(tenantId, CACHE_TAGS.pensionSettings)],
      revalidate: 300,
    },
  );

const loadPensionIdentity = cache((tenantId: string) =>
  getCachedPensionIdentity(tenantId)(),
);

export async function getPensionIdentity(): Promise<PensionIdentity> {
  const tenantId = await resolveTenantIdForData();
  return loadPensionIdentity(tenantId);
}

export type PensionIdentityInput = {
  displayName: string;
  logoUrl: string | null;
  contact: PensionContact;
};

export async function updatePensionIdentity(
  input: PensionIdentityInput,
): Promise<void> {
  const tenantId = await resolveTenantIdForData();
  const { getTenantScope } = await import("@/lib/tenant/scope");
  const { supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("pension_settings")
    .update({
      display_name: input.displayName.trim() || DEFAULT_PENSION_DISPLAY_NAME,
      logo_url: input.logoUrl,
      contact_email: input.contact.email,
      contact_phone: input.contact.phone,
      contact_whatsapp: input.contact.whatsapp,
      contact_telegram: input.contact.telegram,
      contact_facebook: input.contact.facebook,
      contact_instagram: input.contact.instagram,
    })
    .eq("tenant_id", tenantId)
    .select("tenant_id")
    .maybeSingle();

  if (error) {
    if (isIdentityMigrationMissing(error.message) || isLogoColumnMissing(error.message)) {
      throw new Error("settings.identity_migration_required");
    }
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("settings.pension_settings_missing");
  }
}
