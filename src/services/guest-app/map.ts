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
  const appearance = {
    ...DEFAULT_GUEST_APP_SETTINGS.appearance,
    ...((row.appearance ?? {}) as GuestAppAppearance),
  };
  const content = {
    ...DEFAULT_GUEST_APP_SETTINGS.content,
    ...((row.content ?? {}) as GuestAppContent),
  };

  return {
    enabled: row.enabled,
    appearance,
    features: mergeFeatures(row.features),
    content,
  };
}

export function isGuestAppMigrationMissing(message: string): boolean {
  return (
    message.includes("guest_app_settings") ||
    message.includes("booking_guest_access")
  );
}
