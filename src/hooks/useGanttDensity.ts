"use client";

import { useCallback, useEffect, useState } from "react";
import { readLocalStorageFirst } from "@/lib/storage/local";

export type GanttDensity = "comfortable" | "compact";

export const GANTT_DENSITY_STORAGE_KEY = "zalmox-gantt-density";
const LEGACY_GANTT_DENSITY_STORAGE_KEY = "casaemil-gantt-density";

function readStoredDensity(): GanttDensity {
  if (typeof window === "undefined") return "compact";
  const raw = readLocalStorageFirst([
    GANTT_DENSITY_STORAGE_KEY,
    LEGACY_GANTT_DENSITY_STORAGE_KEY,
  ]);
  return raw === "comfortable" ? "comfortable" : "compact";
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
      localStorage.setItem(GANTT_DENSITY_STORAGE_KEY, next);
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
