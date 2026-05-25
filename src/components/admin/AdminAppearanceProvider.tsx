"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  applyPaletteTokens,
  resolvePaletteDefinition,
  resolvePaletteId,
  type AdminPaletteSettings,
} from "@/lib/admin-palettes";
import {
  readAppearanceFromStorage,
  writeAppearanceToStorage,
  type AdminTheme,
} from "@/lib/admin-theme";

type AppearanceContextValue = {
  theme: AdminTheme;
  settings: AdminPaletteSettings;
  resolvedPaletteId: string;
  setTheme: (theme: AdminTheme) => void;
  toggleTheme: () => void;
  applySettings: (next: AdminPaletteSettings) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);
const APPEARANCE_CHANGE_EVENT = "casaemil:admin-appearance-change";

function mergeAppearanceSettings(
  initialSettings: AdminPaletteSettings,
  stored: AdminPaletteSettings
): AdminPaletteSettings {
  return {
    admin_palette_source:
      stored.admin_palette_source ?? initialSettings.admin_palette_source,
    admin_palette_key:
      stored.admin_palette_key || initialSettings.admin_palette_key,
    admin_day_night:
      stored.admin_day_night ?? initialSettings.admin_day_night,
  };
}

function subscribeToAppearance(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleChange = () => onStoreChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener(APPEARANCE_CHANGE_EVENT, handleChange);
  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(APPEARANCE_CHANGE_EVENT, handleChange);
  };
}

function readMergedAppearance(
  initialSettings: AdminPaletteSettings
): AdminPaletteSettings {
  if (typeof window === "undefined") return initialSettings;
  return mergeAppearanceSettings(initialSettings, readAppearanceFromStorage());
}

export function useAdminTheme(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    throw new Error("useAdminTheme must be used within AdminAppearanceProvider");
  }
  return ctx;
}

export function AdminAppearanceProvider({
  children,
  initialSettings,
}: {
  children: ReactNode;
  initialSettings: AdminPaletteSettings;
}) {
  const settings = useSyncExternalStore(
    subscribeToAppearance,
    () => readMergedAppearance(initialSettings),
    () => initialSettings
  );

  const resolvedPaletteId = useMemo(
    () => resolvePaletteId(settings),
    [settings]
  );

  const applyFull = useCallback((next: AdminPaletteSettings) => {
    writeAppearanceToStorage(next);
    const def = resolvePaletteDefinition(next);
    applyPaletteTokens(def, next.admin_day_night);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(APPEARANCE_CHANGE_EVENT));
    }
  }, []);

  useEffect(() => {
    const def = resolvePaletteDefinition(settings);
    applyPaletteTokens(def, settings.admin_day_night);
  }, [settings]);

  const setTheme = useCallback(
    (theme: AdminTheme) => {
      const next = { ...settings, admin_day_night: theme };
      applyFull(next);
    },
    [settings, applyFull]
  );

  const toggleTheme = useCallback(() => {
    setTheme(settings.admin_day_night === "day" ? "night" : "day");
  }, [settings.admin_day_night, setTheme]);

  const value = useMemo(
    () => ({
      theme: settings.admin_day_night,
      settings,
      resolvedPaletteId,
      setTheme,
      toggleTheme,
      applySettings: applyFull,
    }),
    [settings, resolvedPaletteId, setTheme, toggleTheme, applyFull]
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

/** Compat: toggle doar zi/noapte în HUD */
export { AdminAppearanceProvider as AdminThemeProvider };
