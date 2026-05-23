"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  type PresentationThemeId,
} from "@/lib/presentation-themes";

const ThemeContext = createContext<{
  theme: PresentationThemeId;
  setTheme: (id: PresentationThemeId) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<PresentationThemeId>(DEFAULT_THEME);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as PresentationThemeId | null;
      if (saved === "onyx" || saved === "garden" || saved === "sand") {
        setThemeState(saved);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme, ready]);

  const setTheme = useCallback((id: PresentationThemeId) => {
    setThemeState(id);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function usePresentationTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("usePresentationTheme în ThemeProvider");
  return ctx;
}
