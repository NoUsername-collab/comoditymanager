import { getTenantScope, withTenantId } from "@/lib/tenant/scope";
import type { PublicSiteSettingsInput } from "@/features/public-site/domain/types";
import { isPublicSiteMigrationMissing } from "./map";

export async function upsertPublicSiteSettingsImpl(
  tenantId: string,
  input: PublicSiteSettingsInput
): Promise<void> {
  const { supabase } = await getTenantScope();

  const { data: existing, error: readErr } = await supabase
    .from("public_site_settings")
    .select("id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (readErr) {
    if (isPublicSiteMigrationMissing(readErr.message)) {
      throw new Error("public_site.migration_missing");
    }
    throw new Error(readErr.message);
  }

  const settingsPayload = withTenantId(tenantId, {
    template_id: input.templateId,
    theme_id: input.themeId,
    published: input.published,
    booking_enabled: input.bookingEnabled,
    booking_nav_position: input.bookingNavPosition,
    hero: input.hero,
    contact: input.contact,
    seo: input.seo,
  });

  let settingsId = existing?.id as string | undefined;

  if (settingsId) {
    const { error } = await supabase
      .from("public_site_settings")
      .update(settingsPayload)
      .eq("id", settingsId)
      .eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase
      .from("public_site_settings")
      .insert(settingsPayload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    settingsId = data.id as string;
  }

  const { error: deleteErr } = await supabase
    .from("public_site_sections")
    .delete()
    .eq("tenant_id", tenantId);

  if (deleteErr) throw new Error(deleteErr.message);

  if (input.sections.length === 0) return;

  const rows = input.sections.map((section, index) =>
    withTenantId(tenantId, {
      section_type: section.sectionType,
      sort_order: section.sortOrder ?? index * 10,
      visible: section.visible,
      payload: section.payload,
    })
  );

  const { error: insertErr } = await supabase
    .from("public_site_sections")
    .insert(rows);

  if (insertErr) throw new Error(insertErr.message);

  void settingsId;
}
