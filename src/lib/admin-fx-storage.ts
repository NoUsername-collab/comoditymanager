export type AdminFxPrefs = {
  soundEnabled: boolean;
};

const KEY = "casa-emil-admin-fx";

export function readAdminFxPrefs(): AdminFxPrefs {
  if (typeof window === "undefined") return { soundEnabled: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { soundEnabled: false };
    const parsed = JSON.parse(raw) as Partial<AdminFxPrefs>;
    return { soundEnabled: parsed.soundEnabled === true };
  } catch {
    return { soundEnabled: false };
  }
}

export function writeAdminFxPrefs(prefs: AdminFxPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(prefs));
}
