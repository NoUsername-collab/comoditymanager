import { cache } from "react";
import { DEFAULT_GUEST_APP_SETTINGS } from "@/domain/guest-app/defaults";
import type { GuestAppSettings } from "@/domain/guest-app/types";
import { getTenantScope } from "@/lib/tenant/scope";
import {
  isGuestAppMigrationMissing,
  mapGuestAppSettingsRow,
} from "./map";

const loadGuestAppSettings = cache(async (): Promise<GuestAppSettings> => {
  const { tenantId, supabase } = await getTenantScope();
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
});

export async function getGuestAppSettings(): Promise<GuestAppSettings> {
  return loadGuestAppSettings();
}
