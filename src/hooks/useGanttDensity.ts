"use client";

import { useCallback, useEffect, useState } from "react";
import { useCompactLayoutHints } from "@/hooks/useMobileLayout";

export type GanttDensity = "comfortable" | "compact";

const STORAGE_KEY = "casaemil-gantt-density";

function readStoredDensity(): GanttDensity {
  if (typeof window === "undefined") return "comfortable";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === "compact" ? "compact" : "comfortable";
  } catch {
    return "comfortable";
  }
}

/** Desktop calendar density — comfortable = wide cols + scroll; compact = overview în viewport. */
export function useGanttDensity() {
  const { compactChrome } = useCompactLayoutHints();
  const [density, setDensityState] = useState<GanttDensity>("comfortable");

  useEffect(() => {
    setDensityState(readStoredDensity());
  }, []);

  const setDensity = useCallback((next: GanttDensity) => {
    setDensityState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  const effectiveDensity: GanttDensity = compactChrome ? "compact" : density;

  return {
    density: effectiveDensity,
    setDensity,
    canToggle: !compactChrome,
  };
}
