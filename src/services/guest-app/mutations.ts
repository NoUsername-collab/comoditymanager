import type { GuestAppSettingsInputParsed } from "@/domain/settings/schemas/guest-app";
import { DEFAULT_GUEST_APP_SETTINGS } from "@/domain/guest-app/defaults";
import { withTenantId } from "@/lib/tenant/scope";
import { mapGuestAppSettingsRow } from "./map";
import { getGuestAppPublicDb } from "./public-db";
import type { GuestAppSettings } from "@/domain/guest-app/types";

export type GuestAppSettingsInput = GuestAppSettingsInputParsed;

export async function upsertGuestAppSettingsImpl(
  tenantId: string,
  input: GuestAppSettingsInput,
): Promise<void> {
  const { supabase } = await getGuestAppPublicDb();
  const { error } = await supabase.from("guest_app_settings").upsert(
    withTenantId(tenantId, {
      enabled: input.enabled,
      use_primary_contact: input.usePrimaryContact,
      appearance: input.appearance,
      features: input.features,
      content: input.content,
    }),
    { onConflict: "tenant_id" },
  );
  if (error) throw new Error(error.message);
}

export async function ensureGuestAppSettingsRow(
  tenantId: string,
): Promise<GuestAppSettings> {
  const { supabase } = await getGuestAppPublicDb();
  const { data, error } = await supabase
    .from("guest_app_settings")
    .select("enabled, use_primary_contact, appearance, features, content")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data) return mapGuestAppSettingsRow(data);

  const defaults = DEFAULT_GUEST_APP_SETTINGS;
  const { error: insError } = await supabase.from("guest_app_settings").insert(
    withTenantId(tenantId, {
      enabled: defaults.enabled,
      use_primary_contact: defaults.usePrimaryContact,
      appearance: defaults.appearance,
      features: defaults.features,
      content: defaults.content,
    }),
  );
  if (insError) throw new Error(insError.message);
  return defaults;
}

/** Owner/admin: turn guest app on in public schema (what /stay reads). */
export async function enableGuestAppForOwner(tenantId: string): Promise<GuestAppSettings> {
  const current = await ensureGuestAppSettingsRow(tenantId);
  if (current.enabled) return current;

  await upsertGuestAppSettingsImpl(tenantId, {
    enabled: true,
    usePrimaryContact: current.usePrimaryContact,
    appearance: current.appearance,
    features: current.features,
    content: current.content,
  });

  return { ...current, enabled: true };
}
