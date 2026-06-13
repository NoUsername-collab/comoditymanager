import { parseGuestAppThemeSource } from "@/design/themes/guest-app";
import type {
  GuestAppAppearance,
  GuestAppContent,
  GuestAppFeatureDef,
  GuestAppSettings,
} from "@/domain/guest-app/types";
import {
  DEFAULT_GUEST_APP_FEATURES,
  DEFAULT_GUEST_APP_SETTINGS,
} from "@/domain/guest-app/defaults";

function mergeFeatures(raw: unknown): GuestAppFeatureDef[] {
  if (!Array.isArray(raw)) return DEFAULT_GUEST_APP_FEATURES;
  const byId = new Map(DEFAULT_GUEST_APP_FEATURES.map((f) => [f.id, f]));
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const id = String((item as { id?: string }).id ?? "") as GuestAppFeatureDef["id"];
    if (!byId.has(id)) continue;
    const state = (item as { state?: string }).state;
    const base = byId.get(id)!;
    byId.set(id, {
      ...base,
      state:
        state === "live" || state === "mock" || state === "hidden"
          ? state
          : base.state,
    });
  }
  return [...byId.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function mapGuestAppSettingsRow(row: {
  enabled: boolean;
  appearance: unknown;
  features: unknown;
  content: unknown;
}): GuestAppSettings {
  const rawAppearance = (row.appearance ?? {}) as GuestAppAppearance;
  const hasCustomColors =
    Boolean(rawAppearance.primaryColor) || Boolean(rawAppearance.accentColor);
  const themeId =
    parseGuestAppThemeSource(rawAppearance.themeId) ??
    (hasCustomColors ? "custom" : DEFAULT_GUEST_APP_SETTINGS.appearance.themeId);
  const appearance: GuestAppAppearance = {
    ...DEFAULT_GUEST_APP_SETTINGS.appearance,
    ...rawAppearance,
    themeId,
  };
  const content = {
    ...DEFAULT_GUEST_APP_SETTINGS.content,
    ...((row.content ?? {}) as GuestAppContent),
  };

  return {
    enabled: row.enabled !== false,
    appearance,
    features: mergeFeatures(row.features),
    content,
  };
}

export function isGuestAppMigrationMissing(message: string): boolean {
  return (
    message.includes("guest_app_settings") ||
    message.includes("booking_guest_access") ||
    message.includes("guest_precheckin_submissions") ||
    message.includes("guest_green_stay_requests")
  );
}
