import { tenantSlugFromHost } from "@/lib/tenant/host";

export type AdminFxPrefs = {
  soundEnabled: boolean;
};

function storageKey(): string {
  if (typeof window === "undefined") return "hospira-admin-fx";
  const slug = tenantSlugFromHost(window.location.host);
  return slug ? `hospira-admin-fx:${slug}` : "hospira-admin-fx";
}

export function readAdminFxPrefs(): AdminFxPrefs {
  if (typeof window === "undefined") return { soundEnabled: false };
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return { soundEnabled: false };
    const parsed = JSON.parse(raw) as Partial<AdminFxPrefs>;
    return { soundEnabled: parsed.soundEnabled === true };
  } catch {
    return { soundEnabled: false };
  }
}

export function writeAdminFxPrefs(prefs: AdminFxPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(), JSON.stringify(prefs));
}
