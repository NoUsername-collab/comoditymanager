"use client";

import { useCallback, useEffect, useMemo, type RefObject } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { buildCalendarQuery } from "@/lib/gantt-query";
import { jumpToDateInView, navigateRange } from "@/domain/gantt/view-range";
import { mergeAvailabilityPanelSearch } from "@/lib/availability-panel-query";
import { addDays, parseIso } from "@/lib/stay-dates";
import type { GanttFeatureFilter, GanttFilter } from "@/domain/gantt/filters";
import type { GanttLayerFilter } from "@/domain/gantt/occupancy-layer";
import type { GanttViewRange, GanttZoom } from "@/domain/gantt/view-range";
import {
  normalizeZoomChoice,
  periodStepMeta,
  type InlineZoomChoice,
} from "@/components/admin/gantt/GanttGridHelpers";
import { useTranslations } from "next-intl";

export type GanttCalendarPatch = {
  y?: number;
  m?: number;
  zoom?: GanttZoom;
  ws?: string | null;
  q?: number;
  filter?: GanttFilter;
  layer?: GanttLayerFilter;
  feat?: GanttFeatureFilter;
  fd?: string | null;
  view?: "all" | "room";
  room?: string | null;
};

export function useGanttCalendarNavigation({
  viewRange,
  filter,
  featureFilter,
  layerFilter,
  focusDay,
  effectiveToday,
  suppressHeaderClickUntilRef,
  todayIndex,
  scrollToTodayColumn,
  scrolledPeriodRef,
}: {
  viewRange: GanttViewRange;
  filter: GanttFilter;
  featureFilter: GanttFeatureFilter;
  layerFilter: GanttLayerFilter;
  focusDay: string | null;
  effectiveToday: string;
  suppressHeaderClickUntilRef: RefObject<number>;
  todayIndex: number;
  scrollToTodayColumn: () => void;
  scrolledPeriodRef: RefObject<string | null>;
}) {
  const tCommon = useTranslations("admin.common");
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSummaryDayClick = useCallback(
    (iso: string) => {
      if (Date.now() < suppressHeaderClickUntilRef.current) return;
      const isActive = filter === "free" && focusDay === iso;
      const y = Number(searchParams.get("y")) || viewRange.days[0]?.iso.slice(0, 4);
      const m =
        searchParams.get("m") !== null
          ? Number(searchParams.get("m"))
          : Number(viewRange.days[0]?.iso.slice(5, 7)) - 1;
      const q = buildCalendarQuery({
        y: Number(y) || new Date().getFullYear(),
        m: Number.isFinite(m) ? m : new Date().getMonth(),
        view: searchParams.get("view") ?? undefined,
        building: searchParams.get("building") ?? undefined,
        room: searchParams.get("room") ?? undefined,
        zoom: viewRange.zoom,
        ws: viewRange.zoom === "week" ? viewRange.days[0]?.iso : undefined,
        q:
          viewRange.zoom === "quarter"
            ? Number(viewRange.periodKey.split("-")[2])
            : undefined,
        filter: isActive ? "all" : "free",
        layer: (searchParams.get("layer") as GanttLayerFilter) ?? undefined,
        feat: (searchParams.get("feat") as "ac" | "fridge") ?? undefined,
        fd: isActive ? undefined : iso,
      });
      router.push(`/admin/calendar?${q}`);
    },
    [filter, focusDay, router, searchParams, viewRange, suppressHeaderClickUntilRef]
  );

  const zoomChoice = useMemo(
    () => normalizeZoomChoice(viewRange.zoom),
    [viewRange.zoom]
  );
  const todayStartAnchor = useMemo(
    () => (zoomChoice === "today" ? effectiveToday : addDays(effectiveToday, -1)),
    [zoomChoice, effectiveToday]
  );
  const firstIso = viewRange.days[0]?.iso ?? effectiveToday;
  const firstDate = parseIso(firstIso);
  const currentYear =
    searchParams.get("y") !== null
      ? Number(searchParams.get("y"))
      : firstDate.getFullYear();
  const currentMonth =
    searchParams.get("m") !== null
      ? Number(searchParams.get("m"))
      : firstDate.getMonth();
  const currentWs = searchParams.get("ws") ?? undefined;
  const currentBuildingId = searchParams.get("building") ?? null;
  const selectedFeature = featureFilter;
  const isTodayStartMode = currentWs === todayStartAnchor;
  const isAvailabilityPanelOpen = searchParams.get("avail") === "1";
  const hasActiveFilters = filter !== "all" || selectedFeature !== "all";

  const pushCalendarPatch = useCallback(
    (patch: GanttCalendarPatch) => {
      const q = buildCalendarQuery({
        y: patch.y ?? (Number.isFinite(currentYear) ? currentYear : firstDate.getFullYear()),
        m: patch.m ?? (Number.isFinite(currentMonth) ? currentMonth : firstDate.getMonth()),
        view: patch.view ?? "all",
        room: patch.room !== undefined ? patch.room ?? undefined : undefined,
        zoom: patch.zoom ?? viewRange.zoom,
        ws: patch.ws !== undefined ? patch.ws ?? undefined : currentWs,
        q:
          patch.q ??
          (viewRange.zoom === "quarter"
            ? Number(viewRange.periodKey.split("-")[2])
            : undefined),
        filter: patch.filter ?? filter,
        layer: patch.layer ?? layerFilter,
        feat: patch.feat ?? selectedFeature,
        fd: patch.fd !== undefined ? patch.fd ?? undefined : focusDay || undefined,
      });
      router.push(`/admin/calendar?${q}`);
    },
    [
      currentMonth,
      currentYear,
      currentWs,
      filter,
      firstDate,
      focusDay,
      layerFilter,
      router,
      selectedFeature,
      viewRange.periodKey,
      viewRange.zoom,
    ]
  );

  const handleInlineZoomChange = useCallback(
    (nextZoom: InlineZoomChoice) => {
      const currentQuarter =
        viewRange.zoom === "quarter"
          ? Number(viewRange.periodKey.split("-")[2])
          : Math.floor(currentMonth / 3);
      const nextTodayStartAnchor =
        nextZoom === "today" ? effectiveToday : addDays(effectiveToday, -1);
      pushCalendarPatch({
        zoom: nextZoom,
        ws:
          nextZoom === "quarter" || nextZoom === "days30"
            ? isTodayStartMode
              ? nextTodayStartAnchor
              : null
            : isTodayStartMode
              ? nextTodayStartAnchor
              : effectiveToday,
        q: nextZoom === "quarter" ? currentQuarter : undefined,
      });
    },
    [currentMonth, effectiveToday, isTodayStartMode, pushCalendarPatch, viewRange.periodKey, viewRange.zoom]
  );

  const toggleTodayStartMode = useCallback(() => {
    if (isTodayStartMode) {
      const todayDate = parseIso(effectiveToday);
      pushCalendarPatch({
        y: todayDate.getFullYear(),
        m: todayDate.getMonth(),
        ws:
          viewRange.zoom === "quarter" || viewRange.zoom === "days30"
            ? null
            : effectiveToday,
        q: viewRange.zoom === "quarter" ? Math.floor(todayDate.getMonth() / 3) : undefined,
      });
      return;
    }

    const anchorDate = parseIso(todayStartAnchor);
    pushCalendarPatch({
      y: anchorDate.getFullYear(),
      m: anchorDate.getMonth(),
      ws: todayStartAnchor,
      q: viewRange.zoom === "quarter" ? Math.floor(anchorDate.getMonth() / 3) : undefined,
    });
  }, [
    effectiveToday,
    isTodayStartMode,
    pushCalendarPatch,
    todayStartAnchor,
    viewRange.zoom,
  ]);

  useEffect(() => {
    if (todayIndex < 0 || scrolledPeriodRef.current === viewRange.periodKey) {
      return;
    }
    scrolledPeriodRef.current = viewRange.periodKey;
    if (isTodayStartMode) {
      return;
    }
    const t = window.setTimeout(scrollToTodayColumn, 120);
    return () => window.clearTimeout(t);
  }, [viewRange.periodKey, todayIndex, isTodayStartMode, scrollToTodayColumn, scrolledPeriodRef]);

  const navigatePeriod = useCallback(
    (direction: -1 | 1) => {
      const next = navigateRange(
        viewRange,
        direction,
        Number.isFinite(currentYear) ? currentYear : firstDate.getFullYear(),
        Number.isFinite(currentMonth) ? currentMonth : firstDate.getMonth()
      );
      pushCalendarPatch({
        y: next.y,
        m: next.m,
        zoom: next.zoom,
        ws: next.ws ?? null,
        q: next.q,
      });
    },
    [currentMonth, currentYear, firstDate, pushCalendarPatch, viewRange]
  );

  const jumpToDate = useCallback(
    (iso: string) => {
      const patch = jumpToDateInView(iso, viewRange.zoom);
      pushCalendarPatch({
        y: patch.y,
        m: patch.m,
        zoom: patch.zoom,
        ws: patch.ws,
        q: patch.q,
      });
    },
    [pushCalendarPatch, viewRange.zoom]
  );

  const toggleAvailabilityPanel = useCallback(() => {
    const next = mergeAvailabilityPanelSearch(new URLSearchParams(searchParams.toString()), {
      open: !isAvailabilityPanelOpen ? true : false,
      year: Number.isFinite(currentYear) ? currentYear : firstDate.getFullYear(),
      month: Number.isFinite(currentMonth) ? currentMonth : firstDate.getMonth(),
      day: focusDay || null,
      buildingId: currentBuildingId,
      view: "month",
      weekStart: null,
      featureFilter: selectedFeature,
    });
    router.push(`/admin/calendar?${next.toString()}`);
  }, [
    currentBuildingId,
    currentMonth,
    currentYear,
    firstDate,
    focusDay,
    isAvailabilityPanelOpen,
    router,
    searchParams,
    selectedFeature,
  ]);

  const activePeriodStep = periodStepMeta(zoomChoice, tCommon);

  return {
    handleSummaryDayClick,
    zoomChoice,
    firstIso,
    isTodayStartMode,
    isAvailabilityPanelOpen,
    hasActiveFilters,
    pushCalendarPatch,
    handleInlineZoomChange,
    toggleTodayStartMode,
    navigatePeriod,
    jumpToDate,
    toggleAvailabilityPanel,
    activePeriodStep,
    selectedFeature,
  };
}
