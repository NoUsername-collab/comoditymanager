import { tenantSlugFromHost } from "@/lib/tenant/host";

export type AdminFxPrefs = {
  soundEnabled: boolean;
};

const FX_STORAGE_PREFIX = "zalmox-admin-fx";
const LEGACY_FX_STORAGE_PREFIX = "nestio-admin-fx";

function scopedKey(prefix: string): string {
  if (typeof window === "undefined") return prefix;
  const slug = tenantSlugFromHost(window.location.host);
  return slug ? `${prefix}:${slug}` : prefix;
}

export function readAdminFxPrefs(): AdminFxPrefs {
  if (typeof window === "undefined") return { soundEnabled: false };
  try {
    const current = localStorage.getItem(scopedKey(FX_STORAGE_PREFIX));
    const raw =
      current != null && current !== ""
        ? current
        : localStorage.getItem(scopedKey(LEGACY_FX_STORAGE_PREFIX));
    if (!raw) return { soundEnabled: false };
    const parsed = JSON.parse(raw) as Partial<AdminFxPrefs>;
    return { soundEnabled: parsed.soundEnabled === true };
  } catch {
    return { soundEnabled: false };
  }
}

export function writeAdminFxPrefs(prefs: AdminFxPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(scopedKey(FX_STORAGE_PREFIX), JSON.stringify(prefs));
}
