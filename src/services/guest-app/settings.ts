import { cache } from "react";
import { DEFAULT_GUEST_APP_SETTINGS } from "@/domain/guest-app/defaults";
import type { GuestAppSettings } from "@/domain/guest-app/types";
import {
  isGuestAppMigrationMissing,
  mapGuestAppSettingsRow,
} from "./map";
import { getGuestAppPublicDb } from "./public-db";

async function fetchGuestAppSettingsRow(
  tenantId: string,
  supabase: Awaited<ReturnType<typeof getGuestAppPublicDb>>["supabase"],
): Promise<GuestAppSettings> {
  const { data, error } = await supabase
    .from("guest_app_settings")
    .select("enabled, appearance, features, content")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    if (isGuestAppMigrationMissing(error.message)) {
      return DEFAULT_GUEST_APP_SETTINGS;
    }
    throw new Error(error.message);
  }

  if (!data) return DEFAULT_GUEST_APP_SETTINGS;
  return mapGuestAppSettingsRow(data);
}

const loadGuestAppSettings = cache(async (): Promise<GuestAppSettings> => {
  const { tenantId, supabase } = await getGuestAppPublicDb();
  return fetchGuestAppSettingsRow(tenantId, supabase);
});

export async function getGuestAppSettings(): Promise<GuestAppSettings> {
  return loadGuestAppSettings();
}

/** Alias — guest /stay routes use the same public-schema settings as admin. */
export async function getGuestAppSettingsPublic(): Promise<GuestAppSettings> {
  return getGuestAppSettings();
}
