import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicAdminClient } from "@/lib/supabase/admin";
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

const getCachedGuestAppSettings = (tenantId: string) =>
  unstable_cache(
    () => fetchGuestAppSettingsRow(tenantId, createPublicAdminClient()),
    ["guest-app-settings", tenantId],
    {
      tags: [`tenant-${tenantId}-guest-app-settings`],
      revalidate: 300,
    }
  );

const loadGuestAppSettings = cache(async (): Promise<GuestAppSettings> => {
  const { tenantId } = await getGuestAppPublicDb();
  return getCachedGuestAppSettings(tenantId)();
});

export async function getGuestAppSettings(): Promise<GuestAppSettings> {
  return loadGuestAppSettings();
}

/** Alias — guest /stay routes use the same public-schema settings as admin. */
export async function getGuestAppSettingsPublic(): Promise<GuestAppSettings> {
  return getGuestAppSettings();
}
