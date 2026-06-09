"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { ThemeId, ThemeMode, ThemeSettings } from "@/lib/themes";
import { readThemeSettings, writeThemeSettings } from "@/lib/themes";
import { applyTheme } from "@/lib/themes";

type AppearanceContextValue = {
  themeId: ThemeId;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  apply: (themeId: ThemeId, mode: ThemeMode) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);
const APPEARANCE_EVENT = "casaemil:appearance-change";

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(APPEARANCE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(APPEARANCE_EVENT, onStoreChange);
  };
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
  initialSettings: ThemeSettings;
}) {
  const cachedSnapshot = useRef(initialSettings);

  const getSnapshot = useCallback(() => {
    const next = readThemeSettings();
    const prev = cachedSnapshot.current;
    if (prev.theme === next.theme && prev.mode === next.mode) return prev;
    cachedSnapshot.current = next;
    return next;
  }, []);

  const getServerSnapshot = useCallback(
    () => initialSettings,
    [initialSettings]
  );

  const settings = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    applyTheme(settings.theme, settings.mode);
  }, [settings.theme, settings.mode]);

  const apply = useCallback((themeId: ThemeId, mode: ThemeMode) => {
    writeThemeSettings({ theme: themeId, mode });
    applyTheme(themeId, mode);
    window.dispatchEvent(new Event(APPEARANCE_EVENT));
  }, []);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const setMode = useCallback(
    (mode: ThemeMode) => apply(settingsRef.current.theme, mode),
    [apply]
  );

  const toggleMode = useCallback(
    () => {
      const s = settingsRef.current;
      apply(s.theme, s.mode === "day" ? "night" : "day");
    },
    [apply]
  );

  const value = useMemo(
    () => ({
      themeId: settings.theme,
      mode: settings.mode,
      setMode,
      toggleMode,
      apply,
    }),
    [settings.theme, settings.mode, setMode, toggleMode, apply]
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export { AdminAppearanceProvider as AdminThemeProvider };
