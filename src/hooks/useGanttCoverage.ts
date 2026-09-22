"use client";

import { useCallback, useEffect, useState } from "react";
import { parseGanttCoverage, type GanttCoverage } from "@/domain/gantt/layout";
import { readLocalStorageFirst } from "@/lib/storage/local";

export type { GanttCoverage };

export const GANTT_COVERAGE_STORAGE_KEY = "zalmox-gantt-coverage";
const LEGACY_KEYS = ["zalmox-gantt-density", "casaemil-gantt-density"];

function readStoredCoverage(): GanttCoverage {
  if (typeof window === "undefined") return 20;
  return parseGanttCoverage(
    readLocalStorageFirst([GANTT_COVERAGE_STORAGE_KEY, ...LEGACY_KEYS]),
  );
}

export function useGanttCoverage() {
  const [coverage, setCoverageState] = useState<GanttCoverage>(20);

  useEffect(() => {
    setCoverageState(readStoredCoverage());
  }, []);

  const setCoverage = useCallback((next: GanttCoverage) => {
    setCoverageState(next);
    try {
      localStorage.setItem(GANTT_COVERAGE_STORAGE_KEY, String(next));
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  return { coverage, setCoverage };
}

export function useGanttBodyHeight(theadRef: { current: HTMLElement | null }) {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    function measure() {
      const el = theadRef.current;
      if (!el) return;
      const bottom = el.getBoundingClientRect().bottom;
      setHeight(Math.max(0, Math.round(window.innerHeight - bottom - 12)));
    }
    measure();
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    if (theadRef.current) ro.observe(theadRef.current);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [theadRef]);

  return height;
}
