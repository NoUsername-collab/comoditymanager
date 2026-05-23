"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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
  writeAdminTheme,
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
  const [settings, setSettings] = useState<AdminPaletteSettings>(initialSettings);

  const resolvedPaletteId = useMemo(
    () => resolvePaletteId(settings),
    [settings]
  );

  const applyFull = useCallback((next: AdminPaletteSettings) => {
    setSettings(next);
    writeAppearanceToStorage(next);
    const def = resolvePaletteDefinition(next);
    applyPaletteTokens(def, next.admin_day_night);
  }, []);

  useEffect(() => {
    const stored = readAppearanceFromStorage();
    const merged: AdminPaletteSettings = {
      admin_palette_source:
        stored.admin_palette_source ?? initialSettings.admin_palette_source,
      admin_palette_key:
        stored.admin_palette_key || initialSettings.admin_palette_key,
      admin_day_night:
        stored.admin_day_night ?? initialSettings.admin_day_night,
    };
    applyFull(merged);
  }, [initialSettings, applyFull]);

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
