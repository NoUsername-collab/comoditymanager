"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { formatDateWithDay } from "@/lib/ro-calendar";
import { GanttDailySummaryRow } from "@/components/admin/gantt/GanttDailySummaryRow";
import { deriveGanttCalendarData } from "@/domain/gantt/calendar-derivations";
import { useIsTouchDevice } from "@/hooks/useDeviceClass";
import { useIsCompactViewport } from "@/hooks/useDisplayProfile";
import { useCompactLayoutHints } from "@/hooks/useMobileLayout";
import type { BookingRow } from "@/services/bookings";
import { type GanttLayerFilter } from "@/domain/gantt/occupancy-layer";
import type { OccupancySegment } from "@/domain/occupancy/types";
import type { GanttFilter } from "@/domain/gantt/filters";
import type { GanttRoom } from "@/domain/gantt/types";
import type { GanttViewRange } from "@/domain/gantt/view-range";
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
} from "@/lib/constants";
import { GanttPinnedSelectionChip } from "@/components/admin/gantt/GanttPinnedSelectionChip";
import type { PinnedSelection } from "@/domain/gantt/pinned-selection";
import {
  setGanttRoomPinnedSpan,
  clearGanttRoomPinnedSpan,
} from "@/domain/gantt/room-at-point";
import { ghostBarPosition } from "@/domain/gantt/drag-create";
import type { GanttOccDetail } from "@/components/admin/gantt/GanttOccupancyDetailPanel";
import type { MoveRoomDraft } from "@/components/admin/gantt/MoveRoomDialog";
import {
  LONG_PRESS_MOVE_PX,
  type GanttCreateDraftRequest,
} from "@/domain/gantt/context-menu";
import { GanttContextMenuProvider } from "@/components/admin/gantt/GanttContextMenuContext";
import { GanttContextMenuBridge } from "@/components/admin/gantt/GanttContextMenuBridge";
import { GanttOperativeCheckProvider } from "@/components/admin/gantt/GanttOperativeCheckProvider";
import {
  type GanttOpsPickerMode,
} from "@/components/admin/gantt/GanttOpsPickerPanel";
import type { GanttFeatureFilter } from "@/domain/gantt/filters";
import { addDays, todayIso } from "@/lib/stay-dates";
import { useGanttCalendarNavigation } from "@/hooks/useGanttCalendarNavigation";
import { GanttCompactToolbar } from "@/components/admin/gantt/GanttCompactToolbar";
import { GanttFiltersPanel } from "@/components/admin/gantt/GanttFiltersPanel";
import { GanttOperativeSurfaces } from "@/components/admin/gantt/GanttOperativeSurfaces";
import { useLocale, useTranslations } from "next-intl";

const GanttCreateDialog = dynamic(
  () =>
    import("@/components/admin/gantt/GanttCreateDialog").then((m) => ({
      default: m.GanttCreateDialog,
    })),
  { ssr: false }
);
const MoveRoomDialog = dynamic(
  () =>
    import("@/components/admin/gantt/MoveRoomDialog").then((m) => ({
      default: m.MoveRoomDialog,
    })),
  { ssr: false }
);
const GanttOccupancyDetailPanelLazy = dynamic(
  () =>
    import("@/components/admin/gantt/GanttOccupancyDetailPanel").then((m) => ({
      default: m.GanttOccupancyDetailPanel,
    })),
  { ssr: false }
);
const GanttToolbarOccForm = dynamic(
  () =>
    import("@/components/admin/gantt/GanttToolbarOccForm").then((m) => ({
      default: m.GanttToolbarOccForm,
    })),
  { ssr: false }
);
const GanttStickyViewportHeader = dynamic(
  () =>
    import("@/components/admin/gantt/GanttStickyViewportHeader").then((m) => ({
      default: m.GanttStickyViewportHeader,
    })),
  { ssr: false }
);

import {
  resolveGanttColumnMetrics,
  resolveGanttDayGridOptions,
} from "@/components/admin/gantt/GanttGridHelpers";
import { GanttDayHeader } from "@/components/admin/gantt/GanttDayHeader";
import { GanttFooterLegend } from "@/components/admin/gantt/GanttFooterLegend";
import { GanttVirtualizedBody } from "@/components/admin/gantt/GanttVirtualizedBody";

export type { GanttRoom };

/** Touch: hold this long on the day header before horizontal pan is enabled. */
const GANTT_TOUCH_PAN_ARM_MS = 2500;

export function GanttCalendar({
  viewRange,
  rooms,
  bookings,
  occupancy = [],
  groupByBuilding = false,
  checkInTime = DEFAULT_CHECK_IN_TIME,
  checkOutTime = DEFAULT_CHECK_OUT_TIME,
  filter = "all",
  featureFilter = "all",
  layerFilter = "all",
  focusDay = null,
  today: todayProp,
  cereriCount = 0,
  arrivalsCount = 0,
  departuresCount = 0,
  cleanCount = 0,
}: {
  viewRange: GanttViewRange;
  rooms: GanttRoom[];
  bookings: BookingRow[];
  occupancy?: OccupancySegment[];
  groupByBuilding?: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  filter?: GanttFilter;
  featureFilter?: GanttFeatureFilter;
  layerFilter?: GanttLayerFilter;
  focusDay?: string | null;
  /** Effective "today" — sim date when simulation is active */
  today?: string;
  /** Today board badge counts for the radial controller */
  cereriCount?: number;
  arrivalsCount?: number;
  departuresCount?: number;
  cleanCount?: number;
}) {
  const effectiveToday = todayProp ?? todayIso();
  const tCommon = useTranslations("admin.common");
  const buildingFallbackLabel = tCommon("building");
  const locale = useLocale();
  const touch = useIsTouchDevice();
  const scrollDragTitle = touch
    ? tCommon("scrollDragTouch")
    : tCommon("scrollDrag");
  const { compactChrome, orientation, isPortrait } = useCompactLayoutHints();
  const compactViewport = useIsCompactViewport();
  const compact =
    viewRange.zoom === "quarter" || compactChrome || compactViewport;
  const columnMetrics = useMemo(
    () =>
      resolveGanttColumnMetrics(
        compactChrome,
        orientation === "landscape" ? "landscape" : "portrait"
      ),
    [compactChrome, orientation]
  );
  const dayGridOptions = useMemo(
    () =>
      resolveGanttDayGridOptions(
        compactChrome,
        isPortrait,
        columnMetrics.dayMin,
        viewRange.days.length
      ),
    [compactChrome, isPortrait, columnMetrics.dayMin, viewRange.days.length]
  );
  const dayIsos = useMemo(() => viewRange.days.map((d) => d.iso), [viewRange.days]);

  const {
    activeBookings,
    occupancyByRoom,
    displaySegmentsByRoom,
    filteredRooms,
    dailyFreeCounts,
    todaySummary,
    operativeCheckInEligible,
    todayFlagsByRoom,
    buildingGroups,
  } = useMemo(
    () =>
      deriveGanttCalendarData({
        rooms,
        bookings,
        occupancy,
        dayIsos,
        effectiveToday,
        filter,
        layerFilter,
        focusDay,
        groupByBuilding,
        buildingFallbackLabel,
      }),
    [
      rooms,
      bookings,
      occupancy,
      dayIsos,
      effectiveToday,
      filter,
      layerFilter,
      focusDay,
      groupByBuilding,
      buildingFallbackLabel,
    ]
  );

  const todayIndex = viewRange.days.findIndex((d) => d.isToday);
  const dayCount = viewRange.days.length;

  // ─── Refs ──────────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const scrolledPeriodRef = useRef<string | null>(null);
  const suppressHeaderClickUntilRef = useRef(0);
  const panStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    startScrollLeft: number;
    moved: boolean;
    armed: boolean;
    armTimer: ReturnType<typeof setTimeout> | null;
    move: (event: PointerEvent) => void;
    end: (event: PointerEvent) => void;
  } | null>(null);

  // ─── Local state ───────────────────────────────────────────────────
  const [isHeaderPanActive, setIsHeaderPanActive] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filtersAnchorRect, setFiltersAnchorRect] = useState<DOMRect | null>(null);
  const [focusBuildingId, setFocusBuildingId] = useState<string | null>(null);
  const [occDetail, setOccDetail] = useState<GanttOccDetail | null>(null);
  const [occFormMode, setOccFormMode] = useState<
    "hold" | "block" | "cerere" | "direct" | "move" | null
  >(null);
  const [moveRoomDraft, setMoveRoomDraft] = useState<MoveRoomDraft | null>(null);
  const [createDraft, setCreateDraft] = useState<GanttCreateDraftRequest | null>(
    null
  );
  const [pinnedSelection, setPinnedSelection] = useState<PinnedSelection | null>(null);
  const [collapsedBuildings, setCollapsedBuildings] = useState<Set<string>>(
    () => new Set()
  );
  const [opsPickerMode, setOpsPickerMode] = useState<GanttOpsPickerMode | null>(
    null
  );

  const handleToggleFocusBuilding = useCallback((buildingId: string) => {
    setFocusBuildingId((prev) => (prev === buildingId ? null : buildingId));
  }, []);

  const handleToggleCollapsedBuilding = useCallback((buildingId: string) => {
    setCollapsedBuildings((prev) => {
      const next = new Set(prev);
      if (next.has(buildingId)) next.delete(buildingId);
      else next.add(buildingId);
      return next;
    });
  }, []);

  // ─── Scroll / pan callbacks ────────────────────────────────────────
  const scrollToTodayColumn = useCallback(() => {
    const el = scrollRef.current;
    if (!el || todayIndex < 0 || dayCount === 0) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;
    const ratio = (todayIndex + 0.5) / dayCount;
    const target = ratio * maxScroll - el.clientWidth * 0.28;
    el.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [todayIndex, dayCount]);

  const endHeaderPan = useCallback(() => {
    const state = panStateRef.current;
    if (!state) return;
    if (state.armTimer !== null) {
      clearTimeout(state.armTimer);
    }
    window.removeEventListener("pointermove", state.move);
    window.removeEventListener("pointerup", state.end);
    window.removeEventListener("pointercancel", state.end);
    document.body.classList.remove("gantt-pan-active");
    panStateRef.current = null;
    setIsHeaderPanActive(false);
  }, []);

  const handleHeaderPanPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const el = scrollRef.current;
      if (!el) return;

      endHeaderPan();

      const isTouch = event.pointerType === "touch";
      const panThreshold = isTouch ? 6 : 3;
      const captureTarget = event.currentTarget;

      const armPan = () => {
        const state = panStateRef.current;
        if (!state) return;
        state.armed = true;
        state.armTimer = null;
        state.startScrollLeft = el.scrollLeft;
        state.startX = state.lastX;
        state.startY = state.lastY;
        setIsHeaderPanActive(true);
        document.body.classList.add("gantt-pan-active");
        if (isTouch && "setPointerCapture" in captureTarget) {
          try {
            captureTarget.setPointerCapture(state.pointerId);
          } catch {
            /* ignore */
          }
        }
      };

      const move = (nextEvent: PointerEvent) => {
        const state = panStateRef.current;
        if (!state || nextEvent.pointerId !== state.pointerId) return;

        state.lastX = nextEvent.clientX;
        state.lastY = nextEvent.clientY;

        if (isTouch && !state.armed) {
          const dx = nextEvent.clientX - state.startX;
          const dy = nextEvent.clientY - state.startY;
          if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_PX) {
            endHeaderPan();
          }
          return;
        }

        const dx = nextEvent.clientX - state.startX;
        const dy = nextEvent.clientY - state.startY;
        if (!state.moved) {
          if (Math.abs(dx) < panThreshold && Math.abs(dy) < panThreshold) return;
          if (isTouch && Math.abs(dy) > Math.abs(dx)) {
            endHeaderPan();
            return;
          }
          state.moved = true;
          suppressHeaderClickUntilRef.current = Date.now() + 260;
        }
        nextEvent.preventDefault();
        el.scrollLeft = state.startScrollLeft - dx;
      };

      const end = (nextEvent: PointerEvent) => {
        const state = panStateRef.current;
        if (!state || nextEvent.pointerId !== state.pointerId) return;
        endHeaderPan();
      };

      panStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        startScrollLeft: el.scrollLeft,
        moved: false,
        armed: !isTouch,
        armTimer: isTouch
          ? setTimeout(armPan, GANTT_TOUCH_PAN_ARM_MS)
          : null,
        move,
        end,
      };

      if (!isTouch) {
        setIsHeaderPanActive(true);
        document.body.classList.add("gantt-pan-active");
        if ("setPointerCapture" in captureTarget) {
          try {
            captureTarget.setPointerCapture(event.pointerId);
          } catch {
            /* ignore */
          }
        }
        event.preventDefault();
      }

      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
    },
    [endHeaderPan]
  );

  // ─── Effects ───────────────────────────────────────────────────────
  useEffect(() => {
    const onScrollToday = () => scrollToTodayColumn();
    window.addEventListener("gantt:scroll-today", onScrollToday);
    return () => window.removeEventListener("gantt:scroll-today", onScrollToday);
  }, [scrollToTodayColumn]);

  useEffect(() => endHeaderPan, [endHeaderPan]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        scrollToTodayColumn();
      }
      if (e.key === "Escape") {
        setFocusBuildingId(null);
        setPinnedSelection((prev) => {
          if (prev) clearGanttRoomPinnedSpan();
          return null;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scrollToTodayColumn]);

  const bookingById = useMemo(
    () => new Map(bookings.map((b) => [b.id, b])),
    [bookings]
  );

  // ─── Event handlers ────────────────────────────────────────────────
  const handleOccOpen = useCallback(
    (seg: OccupancySegment, roomName: string) => {
      setOccDetail({ segment: seg, roomName });
    },
    []
  );

  const handleCtrlDragEnd = useCallback(
    (roomIds: string[], checkIn: string, checkOut: string) => {
      setPinnedSelection((prev) => {
        const dates = prev ?? { checkIn, checkOut };
        const existingSet = new Set(prev?.roomIds ?? []);
        for (const id of roomIds) {
          if (existingSet.has(id)) existingSet.delete(id);
          else existingSet.add(id);
        }
        const nextRoomIds = [...existingSet];
        if (nextRoomIds.length === 0) return null;
        return { roomIds: nextRoomIds, checkIn: dates.checkIn, checkOut: dates.checkOut };
      });
    },
    []
  );

  const commitPinnedSelection = useCallback(() => {
    if (!pinnedSelection) return;
    const firstRoomId = pinnedSelection.roomIds[0] ?? "";
    setCreateDraft({
      roomId: firstRoomId,
      roomIds: pinnedSelection.roomIds,
      roomName: `${pinnedSelection.roomIds.length} camere`,
      checkIn: pinnedSelection.checkIn,
      checkOut: pinnedSelection.checkOut,
      hasConflict: false,
    });
    setPinnedSelection(null);
    clearGanttRoomPinnedSpan();
  }, [pinnedSelection]);

  const cancelPinnedSelection = useCallback(() => {
    setPinnedSelection(null);
    clearGanttRoomPinnedSpan();
  }, []);

  const handleCreateDraftWithPinnedClear = useCallback(
    (draft: GanttCreateDraftRequest) => {
      if (pinnedSelection) {
        setPinnedSelection(null);
        clearGanttRoomPinnedSpan();
      }
      setCreateDraft(draft);
    },
    [pinnedSelection]
  );

  useEffect(() => {
    if (!pinnedSelection) {
      clearGanttRoomPinnedSpan();
      return;
    }
    const startIdx = dayIsos.indexOf(pinnedSelection.checkIn);
    const lastNight = addDays(pinnedSelection.checkOut, -1);
    const endIdx = dayIsos.indexOf(lastNight);
    if (startIdx < 0 && endIdx < 0) {
      clearGanttRoomPinnedSpan();
      return;
    }
    const safeStart = Math.max(0, startIdx);
    const safeEnd = endIdx < 0 ? dayIsos.length - 1 : endIdx;
    const ghost = ghostBarPosition(safeStart, safeEnd, dayIsos.length);
    setGanttRoomPinnedSpan(pinnedSelection.roomIds, {
      leftPct: ghost.leftPct,
      widthPct: ghost.widthPct,
      hasConflict: false,
    });
  }, [pinnedSelection, dayIsos]);

  const {
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
  } = useGanttCalendarNavigation({
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
  });

  const handleCloseFiltersPanel = useCallback(() => {
    setIsFiltersOpen(false);
    setFiltersAnchorRect(null);
  }, []);

  const handleToggleFilters = useCallback((anchorRect: DOMRect) => {
    setFiltersAnchorRect(anchorRect);
    setIsFiltersOpen((prev) => !prev);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <GanttOperativeCheckProvider today={effectiveToday}>
    <GanttContextMenuProvider
      onRequestCreate={setCreateDraft}
      onOpenMoveRoom={setMoveRoomDraft}
      onOpenOccDetail={setOccDetail}
    >
      <GanttContextMenuBridge
        shellRef={shellRef}
        viewRange={viewRange}
        occupancy={occupancy}
      />
      <GanttStickyViewportHeader
        scrollRef={scrollRef}
        shellRef={shellRef}
        theadRef={theadRef}
        counts={dailyFreeCounts}
        viewRange={viewRange}
        compact={compact}
        activeFocusIso={focusDay}
        filterActive={filter === "free" && !!focusDay}
        onDayClick={handleSummaryDayClick}
        onPanPointerDown={handleHeaderPanPointerDown}
        panActive={isHeaderPanActive}
        scrollTitle={scrollDragTitle}
        dayGridOptions={dayGridOptions}
      />
    <div
      key={viewRange.periodKey}
      ref={scrollRef}
      className="gantt-period-enter gantt-scroll w-full overflow-x-auto overflow-y-visible"
    >
      <div
        ref={shellRef}
        className="gantt-shell gantt-shell--premium relative min-w-full overflow-visible"
      >
        <GanttCompactToolbar
          onOpenRequest={() => setOccFormMode("cerere")}
          onOpenHold={() => setOccFormMode("hold")}
          onOpenMove={() => setOccFormMode("move")}
          onOpenBlock={() => setOccFormMode("block")}
          onOpenReception={() => setOccFormMode("direct")}
          onOpenCheckIn={
            operativeCheckInEligible.length > 0
              ? () => setOpsPickerMode("checkin")
              : undefined
          }
          onOpenCheckOut={() => setOpsPickerMode("checkout")}
          cereriCount={cereriCount}
          arrivalsCount={arrivalsCount}
          departuresCount={departuresCount}
          cleanCount={cleanCount}
          zoomChoice={zoomChoice}
          onZoomChange={handleInlineZoomChange}
          periodTitle={viewRange.title}
          firstIso={firstIso}
          onPrevPeriod={() => navigatePeriod(-1)}
          onNextPeriod={() => navigatePeriod(1)}
          onJumpToDate={jumpToDate}
          prevPeriodAria={tCommon("goBackBy", { period: activePeriodStep.aria })}
          nextPeriodAria={tCommon("goForwardBy", { period: activePeriodStep.aria })}
          jumpAria={tCommon("jumpToDate")}
          isTodayStartMode={isTodayStartMode}
          onToggleTodayStartMode={toggleTodayStartMode}
          layerFilter={layerFilter}
          onCalendarPatch={pushCalendarPatch}
          isAvailabilityPanelOpen={isAvailabilityPanelOpen}
          onToggleAvailabilityPanel={toggleAvailabilityPanel}
          isFiltersOpen={isFiltersOpen}
          hasActiveFilters={hasActiveFilters}
          onToggleFilters={handleToggleFilters}
        />

        <GanttFiltersPanel
          open={isFiltersOpen}
          onClose={handleCloseFiltersPanel}
          anchorRect={filtersAnchorRect}
          filter={filter}
          selectedFeature={selectedFeature}
          focusDay={focusDay}
          onCalendarPatch={pushCalendarPatch}
        />

        {filter === "free" && focusDay && (
          <div className="gantt-summary-filter-banner mx-3 mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-xs text-emerald-900">
            <span>
              {tCommon("showingRooms")} <strong>{tCommon("free").toLowerCase()}</strong> {tCommon("onDay")}{" "}
              <strong>{formatDateWithDay(focusDay, locale, true)}</strong>
            </span>
            <button
              type="button"
              className="rounded-md border border-emerald-300 bg-white px-2.5 py-1 font-semibold hover:bg-emerald-100"
              onClick={() => handleSummaryDayClick(focusDay)}
            >
              {tCommon("resetFilter")}
            </button>
          </div>
        )}

        {/* ── Table ──────────────────────────────────────────────── */}
        <table
          className={[
            "w-full table-fixed border-separate border-spacing-0 text-xs",
            "min-w-full",
          ].join(" ")}
          style={{
            minWidth: `max(100%, calc(${columnMetrics.roomCol} + ${viewRange.days.length} * ${columnMetrics.dayMin}))`,
          }}
        >
          <colgroup>
            <col style={{ width: columnMetrics.roomCol }} />
            <col />
          </colgroup>
          <thead ref={theadRef} className="gantt-thead-sticky">
            <tr className="gantt-head-main-row">
              <th className="gantt-head-main-row__room gantt-room-column-header sticky left-0 z-30 px-3 py-[0.72rem] text-left text-xs font-semibold tracking-wide">
                {tCommon("room")}
              </th>
              <th className="gantt-head-main-row__days p-0">
                <GanttDayHeader
                  columns={viewRange.days}
                  compact={compact}
                  onPanPointerDown={handleHeaderPanPointerDown}
                  panActive={isHeaderPanActive}
                  scrollTitle={scrollDragTitle}
                  todayLabel={tCommon("todayPanel")}
                  locale={locale}
                  dayGridOptions={dayGridOptions}
                />
              </th>
            </tr>
            <GanttDailySummaryRow
              counts={dailyFreeCounts}
              viewRange={viewRange}
              compact={compact}
              activeFocusIso={focusDay}
              filterActive={filter === "free" && !!focusDay}
              onDayClick={handleSummaryDayClick}
              onPanPointerDown={handleHeaderPanPointerDown}
              panActive={isHeaderPanActive}
              scrollTitle={scrollDragTitle}
              dayGridOptions={dayGridOptions}
            />
          </thead>
          <GanttVirtualizedBody
            shellRef={shellRef}
            theadRef={theadRef}
            groupByBuilding={groupByBuilding}
            buildingGroups={buildingGroups}
            filteredRooms={filteredRooms}
            collapsedBuildings={collapsedBuildings}
            focusBuildingId={focusBuildingId}
            onToggleFocusBuilding={handleToggleFocusBuilding}
            onToggleCollapsedBuilding={handleToggleCollapsedBuilding}
            viewRange={viewRange}
            occupancyByRoom={occupancyByRoom}
            displaySegmentsByRoom={displaySegmentsByRoom}
            checkInTime={checkInTime}
            checkOutTime={checkOutTime}
            compact={compact}
            touch={touch}
            todayFlagsByRoom={todayFlagsByRoom}
            onOccOpen={handleOccOpen}
            bookingById={bookingById}
            onMoveRoom={setMoveRoomDraft}
            onCreateDraft={handleCreateDraftWithPinnedClear}
            pinnedSelection={pinnedSelection}
            onCtrlDragEnd={handleCtrlDragEnd}
            today={effectiveToday}
            dayGridOptions={dayGridOptions}
            disableVirtualization={compactChrome}
            emptyMessage={
              filter !== "all"
                ? tCommon("noRoomForFilterTryAll")
                : tCommon("noRoomForFilter")
            }
          />
        </table>

        {pinnedSelection && (
          <GanttPinnedSelectionChip
            selection={pinnedSelection}
            onCommit={commitPinnedSelection}
            onCancel={cancelPinnedSelection}
          />
        )}

        <GanttFooterLegend
          checkInTime={checkInTime}
          checkOutTime={checkOutTime}
        />
      </div>
    </div>
      <GanttOperativeSurfaces
        opsPickerMode={opsPickerMode}
        setOpsPickerMode={setOpsPickerMode}
        activeBookings={activeBookings}
        today={effectiveToday}
      />
      <GanttCreateDialog
        draft={createDraft}
        rooms={rooms.map((r) => ({
          id: r.id,
          name: r.name,
          building_name: r.building_name,
        }))}
        bookings={bookings}
        onClose={() => setCreateDraft(null)}
      />
      <GanttOccupancyDetailPanelLazy
        detail={occDetail}
        onClose={() => setOccDetail(null)}
      />
      <MoveRoomDialog
        key={
          moveRoomDraft
            ? `${moveRoomDraft.bookingId}:${moveRoomDraft.sourceRoomId}`
            : "move-room-closed"
        }
        draft={moveRoomDraft}
        rooms={rooms.map((r) => ({
          id: r.id,
          name: r.name,
          building_name: r.building_name,
        }))}
        onClose={() => setMoveRoomDraft(null)}
      />
      <GanttToolbarOccForm
        key={occFormMode ?? "closed"}
        mode={occFormMode}
        rooms={rooms.map((r) => ({
          id: r.id,
          name: r.name,
          building_name: r.building_name,
        }))}
        bookings={bookings}
        onClose={() => setOccFormMode(null)}
        today={effectiveToday}
      />
    </GanttContextMenuProvider>
    </GanttOperativeCheckProvider>
  );
}
