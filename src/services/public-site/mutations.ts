import type { PublicSiteSettingsInputParsed } from "@/domain/settings/schemas/public-site";
import { getTenantScope } from "@/lib/tenant/scope";
import { isPublicSiteMigrationMissing, isPublicSiteRpcMissing } from "./map";

type AtomicRpcArgs = {
  p_tenant_id: string;
  p_template_id: string;
  p_theme_id: string;
  p_published: boolean;
  p_booking_enabled: boolean;
  p_booking_nav_position: string;
  p_use_primary_contact: boolean;
  p_hero: PublicSiteSettingsInputParsed["hero"];
  p_contact: PublicSiteSettingsInputParsed["contact"];
  p_seo: PublicSiteSettingsInputParsed["seo"];
  p_booking_notice: PublicSiteSettingsInputParsed["bookingNotice"];
  p_chrome: PublicSiteSettingsInputParsed["chrome"];
  p_pages: PublicSiteSettingsInputParsed["pages"];
  p_sections: Array<{
    section_type: string;
    sort_order: number;
    visible: boolean;
    payload: PublicSiteSettingsInputParsed["sections"][number]["payload"];
  }>;
};

function throwPublicSiteWriteError(message: string): never {
  if (isPublicSiteMigrationMissing(message)) {
    throw new Error("public_site.migration_missing");
  }
  throw new Error(message);
}

export async function upsertPublicSiteSettingsImpl(
  tenantId: string,
  input: PublicSiteSettingsInputParsed,
): Promise<void> {
  const { supabase } = await getTenantScope();

  const sectionsPayload = input.sections.map((section, index) => ({
    section_type: section.sectionType,
    sort_order: section.sortOrder ?? index * 10,
    visible: section.visible,
    payload: section.payload,
  }));

  const args: AtomicRpcArgs = {
    p_tenant_id: tenantId,
    p_template_id: input.templateId,
    p_theme_id: input.themeId,
    p_published: input.published,
    p_booking_enabled: input.bookingEnabled,
    p_booking_nav_position: input.bookingNavPosition,
    p_use_primary_contact: input.usePrimaryContact,
    p_hero: input.hero,
    p_contact: input.contact,
    p_seo: input.seo,
    p_booking_notice: input.bookingNotice,
    p_chrome: input.chrome ?? {},
    p_pages: input.pages ?? {},
    p_sections: sectionsPayload,
  };

  const { error } = await supabase.rpc("upsert_public_site_settings_atomic", args);

  if (error && isPublicSiteRpcMissing(error.message)) {
    const { p_chrome, p_pages, ...legacyArgs } = args;
    const retry = await supabase.rpc("upsert_public_site_settings_atomic", legacyArgs);
    if (retry.error) {
      throwPublicSiteWriteError(retry.error.message);
    }
    const extra = await supabase
      .from("public_site_settings")
      .update({ chrome: p_chrome, pages: p_pages })
      .eq("tenant_id", tenantId);
    if (
      extra.error &&
      !extra.error.message.includes("chrome") &&
      !extra.error.message.includes("pages")
    ) {
      throwPublicSiteWriteError(extra.error.message);
    }
    return;
  }

  if (error) {
    throwPublicSiteWriteError(error.message);
  }
}
