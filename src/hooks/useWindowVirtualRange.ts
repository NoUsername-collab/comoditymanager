"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

/** Document Y where the virtualized tbody list starts (below thead). */
export function readGanttScrollMargin(
  shell: HTMLElement | null,
  thead: HTMLElement | null
): number {
  if (!shell || typeof window === "undefined") return 0;
  const shellTop = shell.getBoundingClientRect().top + window.scrollY;
  const theadHeight = thead?.getBoundingClientRect().height ?? 0;
  return shellTop + theadHeight;
}

export function useWindowVirtualRange({
  count,
  estimateSize,
  shellRef,
  theadRef,
  overscan = 4,
  enabled = true,
}: {
  count: number;
  estimateSize: (index: number) => number;
  shellRef: RefObject<HTMLElement | null>;
  theadRef: RefObject<HTMLElement | null>;
  overscan?: number;
  enabled?: boolean;
}) {
  const offsets = useMemo(() => {
    const result = new Array<number>(count + 1);
    result[0] = 0;
    for (let i = 0; i < count; i++) {
      result[i + 1] = result[i]! + estimateSize(i);
    }
    return result;
  }, [count, estimateSize]);

  const totalSize = offsets[count] ?? 0;

  const [range, setRange] = useState(() => ({
    start: 0,
    end: enabled ? Math.min(count, overscan * 2 + 1) : count,
  }));

  const measuringRef = useRef(false);

  const measure = useCallback(() => {
    if (measuringRef.current) return;
    measuringRef.current = true;

    if (!enabled || count === 0) {
      setRange((prev) =>
        prev.start === 0 && prev.end === count ? prev : { start: 0, end: count }
      );
      measuringRef.current = false;
      return;
    }

    const scrollMargin = readGanttScrollMargin(
      shellRef.current,
      theadRef.current
    );
    const viewTop = window.scrollY;
    const viewBottom = viewTop + window.innerHeight;
    const listTop = scrollMargin;
    const listBottom = listTop + totalSize;

    const applyRange = (start: number, end: number) => {
      setRange((prev) =>
        prev.start === start && prev.end === end ? prev : { start, end }
      );
    };

    if (viewBottom < listTop) {
      applyRange(0, Math.min(count, overscan * 2));
      measuringRef.current = false;
      return;
    }
    if (viewTop > listBottom) {
      applyRange(Math.max(0, count - overscan * 2), count);
      measuringRef.current = false;
      return;
    }

    const relTop = Math.max(0, viewTop - listTop);
    const relBottom = Math.min(totalSize, viewBottom - listTop);

    let lo = 0;
    let hi = count;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((offsets[mid + 1] ?? 0) <= relTop) lo = mid + 1;
      else hi = mid;
    }
    const start = lo;

    lo = start;
    hi = count;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((offsets[mid] ?? 0) < relBottom) lo = mid + 1;
      else hi = mid;
    }
    const end = lo;

    applyRange(
      Math.max(0, start - overscan),
      Math.min(count, end + overscan)
    );

    measuringRef.current = false;
  }, [count, enabled, offsets, overscan, shellRef, theadRef, totalSize]);

  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
    };
  }, [measure]);

  const paddingTop = enabled ? (offsets[range.start] ?? 0) : 0;
  const paddingBottom = enabled
    ? totalSize - (offsets[range.end] ?? totalSize)
    : 0;

  return { range, paddingTop, paddingBottom, remeasure: measure };
}
