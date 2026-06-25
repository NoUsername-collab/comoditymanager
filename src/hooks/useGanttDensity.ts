"use client";

import { useCallback, useEffect, useState } from "react";

export type GanttDensity = "comfortable" | "compact";

const STORAGE_KEY = "casaemil-gantt-density";

function readStoredDensity(): GanttDensity {
  if (typeof window === "undefined") return "compact";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === "comfortable" ? "comfortable" : "compact";
  } catch {
    return "compact";
  }
}

/** Desktop calendar density — comfortable = operațional (wide cols); compact = panoramă (fit viewport). */
export function useGanttDensity() {
  const [density, setDensityState] = useState<GanttDensity>("compact");

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

  const effectiveDensity: GanttDensity = density;

  const toggleDensity = useCallback(() => {
    setDensity(density === "comfortable" ? "compact" : "comfortable");
  }, [density, setDensity]);

  return {
    density: effectiveDensity,
    setDensity,
    toggleDensity,
  };
}
