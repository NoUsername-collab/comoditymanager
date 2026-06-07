"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useSearchParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation";
import { buildCalendarQuery } from "@/lib/gantt-query";
import { mergeAvailabilityPanelSearch } from "@/lib/availability-panel-query";
import { formatDateWithDay } from "@/lib/ro-calendar";
import { GanttDailySummaryRow } from "@/components/admin/gantt/GanttDailySummaryRow";
import {
  computeDailyFreeCounts,
} from "@/domain/gantt/daily-free-counts";
import { resolveGanttBuildingColor } from "@/lib/building-color-palette";
import { useIsTouchDevice } from "@/hooks/useDeviceClass";
import { useIsCompactViewport } from "@/hooks/useDisplayProfile";
import type { BookingRow } from "@/services/bookings";
import {
  filterOccupancyForLayer,
  type GanttLayerFilter,
} from "@/domain/gantt/occupancy-layer";
import type { OccupancySegment } from "@/domain/occupancy/types";
import type { GanttFilter } from "@/domain/gantt/filters";
import { focusDayInRange } from "@/domain/gantt/filters";
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
import {
  GanttOccupancyDetailPanel,
  type GanttOccDetail,
} from "@/components/admin/gantt/GanttOccupancyDetailPanel";
import {
  MoveRoomDialog,
  type MoveRoomDraft,
} from "@/components/admin/gantt/MoveRoomDialog";
import {
  GanttCreateDialog,
} from "@/components/admin/gantt/GanttCreateDialog";
import { GanttContextMenuProvider } from "@/components/admin/gantt/GanttContextMenuContext";
import { GanttContextMenuPanel } from "@/components/admin/gantt/GanttContextMenuPanel";
import { GanttContextMenuBridge } from "@/components/admin/gantt/GanttContextMenuBridge";
import type { GanttCreateDraftRequest } from "@/domain/gantt/context-menu";
import {
  GanttBuildingMarker,
} from "@/components/admin/gantt/GanttBuildingMarker";
import { resolveGanttAcMarkerColor } from "@/lib/gantt-ac-marker";
import { GanttRadialController } from "@/components/admin/gantt/GanttRadialController";
import { GanttCheckTimeDialog } from "@/components/admin/gantt/GanttCheckTimeDialog";
import {
  GanttOpsPickerPanel,
  type GanttOpsPickerMode,
} from "@/components/admin/gantt/GanttOpsPickerPanel";
import { GanttToolbarOccForm } from "@/components/admin/gantt/GanttToolbarOccForm";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import {
  type RoomTodayFlags,
  summarizeGanttToday,
} from "@/domain/gantt/today-activity";
import type { GanttZoom } from "@/domain/gantt/view-range";
import { navigateRange } from "@/domain/gantt/view-range";
import { addDays, nightOccupied, parseIso, todayIso } from "@/lib/stay-dates";
import type { GanttFeatureFilter } from "@/domain/gantt/filters";
import { SegmentGroup } from "@/components/admin/gantt/GanttToolbar";
import { HudIconGrid } from "@/components/admin/AdminHudIcons";
import { useLocale, useTranslations } from "next-intl";

// Extracted sub-components
import {
  ROOM_COL_W,
  DAY_COL_MIN_W,
  type InlineZoomChoice,
  ToolbarFilterIcon,
  normalizeZoomChoice,
  periodStepMeta,
} from "@/components/admin/gantt/GanttGridHelpers";
import { GanttDayHeader } from "@/components/admin/gantt/GanttDayHeader";
import { GanttStickyViewportHeader } from "@/components/admin/gantt/GanttStickyViewportHeader";
import { GanttRoomRow } from "@/components/admin/gantt/GanttRoomRow";
import { GanttFooterLegend } from "@/components/admin/gantt/GanttFooterLegend";

export type { GanttRoom };

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
  const tLayers = useTranslations("admin.gantt.layers");
  const tGantt = useTranslations("admin.gantt");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const touch = useIsTouchDevice();
  const compactViewport = useIsCompactViewport();
  const compact = viewRange.zoom === "quarter" || touch || compactViewport;
  const dayIsos = useMemo(() => viewRange.days.map((d) => d.iso), [viewRange.days]);
  const defaultFocusIso = focusDayInRange(dayIsos, effectiveToday);
  const focusIso =
    filter !== "all" && focusDay ? focusDay : defaultFocusIso;

  // ─── Derived data ──────────────────────────────────────────────────
  const activeBookings = useMemo(
    () => bookings.filter((booking) => booking.status !== "anulata"),
    [bookings]
  );
  const bookingsByRoom = useMemo(() => {
    const map = new Map<string, BookingRow[]>();
    for (const booking of activeBookings) {
      for (const roomId of booking.room_ids) {
        const list = map.get(roomId);
        if (list) list.push(booking);
        else map.set(roomId, [booking]);
      }
    }
    return map;
  }, [activeBookings]);
  const occupancyByRoom = useMemo(() => {
    const map = new Map<string, OccupancySegment[]>();
    for (const segment of occupancy) {
      const list = map.get(segment.roomId);
      if (list) list.push(segment);
      else map.set(segment.roomId, [segment]);
    }
    return map;
  }, [occupancy]);
  const displaySegmentsByRoom = useMemo(() => {
    const stay = new Map<string, OccupancySegment[]>();
    const overlay = new Map<string, OccupancySegment[]>();
    for (const segment of filterOccupancyForLayer(occupancy, layerFilter, effectiveToday)) {
      const target =
        segment.kind === "request" || segment.kind === "stay" ? stay : overlay;
      const list = target.get(segment.roomId);
      if (list) list.push(segment);
      else target.set(segment.roomId, [segment]);
    }
    return { stay, overlay };
  }, [occupancy, layerFilter]);
  const occupiedRoomIdsOnFocus = useMemo(() => {
    const occupied = new Set<string>();
    for (const [roomId, roomBookings] of bookingsByRoom) {
      if (roomBookings.some((booking) => nightOccupied(focusIso, booking.check_in, booking.check_out))) {
        occupied.add(roomId);
      }
    }
    for (const [roomId, segments] of occupancyByRoom) {
      if (segments.some((segment) => nightOccupied(focusIso, segment.checkIn, segment.checkOut))) {
        occupied.add(roomId);
      }
    }
    return occupied;
  }, [bookingsByRoom, occupancyByRoom, focusIso]);
  const filteredRooms = useMemo(() => {
    if (filter === "all") return rooms;
    return rooms.filter((room) =>
      filter === "occupied"
        ? occupiedRoomIdsOnFocus.has(room.id)
        : !occupiedRoomIdsOnFocus.has(room.id)
    );
  }, [rooms, filter, occupiedRoomIdsOnFocus]);
  const dailyFreeCounts = useMemo(
    () => computeDailyFreeCounts(rooms, activeBookings, occupancy, dayIsos),
    [rooms, activeBookings, occupancy, dayIsos]
  );

  const todayIndex = viewRange.days.findIndex((d) => d.isToday);
  const dayCount = viewRange.days.length;

  const todaySummary = useMemo(
    () => summarizeGanttToday(activeBookings, dayIsos, effectiveToday),
    [activeBookings, dayIsos, effectiveToday]
  );
  const todayFlagsByRoom = useMemo(() => {
    const map = new Map<string, RoomTodayFlags>();
    const today = todaySummary.todayIso;
    for (const room of rooms) {
      const roomBookings = bookingsByRoom.get(room.id) ?? [];
      map.set(room.id, {
        arrival: roomBookings.some((booking) => booking.check_in === today),
        departure: roomBookings.some((booking) => booking.check_out === today),
        occupiedTonight: roomBookings.some((booking) =>
          nightOccupied(today, booking.check_in, booking.check_out)
        ),
      });
    }
    return map;
  }, [rooms, bookingsByRoom, todaySummary.todayIso]);

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
    startScrollLeft: number;
    moved: boolean;
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
  const [opsCheckDialog, setOpsCheckDialog] = useState<{
    mode: GanttOpsPickerMode;
    bookingId: string;
    guestName: string;
    plannedCheckIn: string;
    plannedCheckOut: string;
  } | null>(null);

  // ─── Building groups ───────────────────────────────────────────────
  const buildingGroups = groupByBuilding
    ? Array.from(
        filteredRooms.reduce((map, room) => {
          const list = map.get(room.building_id) ?? [];
          list.push(room);
          map.set(room.building_id, list);
          return map;
        }, new Map<string, GanttRoom[]>())
      ).map(([buildingId, buildingRooms]) => ({
        buildingId,
        buildingName: buildingRooms[0]?.building_name ?? tCommon("building"),
        buildingColor: buildingRooms[0]?.building_color ?? null,
        buildingAcMode: buildingRooms[0]?.building_ac_mode ?? "per_room",
        hasAnyRoomAc: buildingRooms.some((r) => r.has_ac),
        rooms: buildingRooms,
      }))
    : [];

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
    window.removeEventListener("pointermove", state.move);
    window.removeEventListener("pointerup", state.end);
    window.removeEventListener("pointercancel", state.end);
    document.body.classList.remove("gantt-pan-active");
    panStateRef.current = null;
    setIsHeaderPanActive(false);
  }, []);

  const handleHeaderPanPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (touch) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const el = scrollRef.current;
      if (!el) return;

      endHeaderPan();

      const move = (nextEvent: PointerEvent) => {
        const state = panStateRef.current;
        if (!state || nextEvent.pointerId !== state.pointerId) return;
        const dx = nextEvent.clientX - state.startX;
        const dy = nextEvent.clientY - state.startY;
        if (!state.moved) {
          if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
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
        startScrollLeft: el.scrollLeft,
        moved: false,
        move,
        end,
      };
      setIsHeaderPanActive(true);
      document.body.classList.add("gantt-pan-active");
      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
      event.preventDefault();
    },
    [endHeaderPan, touch]
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

  useEffect(() => {
    const shell = shellRef.current;
    const thead = theadRef.current;
    if (!shell || !thead) return;

    const syncBodyTop = () => {
      const shellTop = shell.getBoundingClientRect().top;
      const theadBottom = thead.getBoundingClientRect().bottom;
      shell.style.setProperty(
        "--gantt-body-top",
        `${Math.max(0, theadBottom - shellTop)}px`
      );
    };

    syncBodyTop();
    const ro = new ResizeObserver(syncBodyTop);
    ro.observe(shell);
    ro.observe(thead);
    window.addEventListener("resize", syncBodyTop);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncBodyTop);
    };
  }, [
    viewRange.periodKey,
    compact,
    todaySummary.arrivals.length,
    todaySummary.departures.length,
    groupByBuilding,
  ]);

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

  // ─── Navigation callbacks ──────────────────────────────────────────
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
    [filter, focusDay, router, searchParams, viewRange]
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
    (patch: {
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
    }) => {
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
  }, [viewRange.periodKey, todayIndex, isTodayStartMode, scrollToTodayColumn]);

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

  // ─── Render ────────────────────────────────────────────────────────
  return (
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
        {/* ── Compact toolbar — single strip ─────────────────────── */}
        <div className="gantt-compact-toolbar mx-3">
          {/* LEFT — action strip (badges / action buttons) */}
          <div className="gantt-compact-toolbar__left">
            <GanttRadialController
              onOpenRequest={() => setOccFormMode("cerere")}
              onOpenHold={() => setOccFormMode("hold")}
              onOpenMove={() => setOccFormMode("move")}
              onOpenBlock={() => setOccFormMode("block")}
              onOpenReception={() => setOccFormMode("direct")}
              onOpenCheckIn={() => setOpsPickerMode("checkin")}
              onOpenCheckOut={() => setOpsPickerMode("checkout")}
              cereriCount={cereriCount}
              arrivalsCount={arrivalsCount}
              departuresCount={departuresCount}
              cleanCount={cleanCount}
            />
          </div>

          {/* CENTER — interval dropdown + date title/picker + today button */}
          <div className="gantt-compact-toolbar__center">
            {/* Interval dropdown */}
            <div className="gantt-compact-toolbar__dropdown-wrap">
              <select
                className="gantt-compact-toolbar__select"
                value={zoomChoice}
                onChange={(e) => handleInlineZoomChange(e.target.value as InlineZoomChoice)}
                aria-label={tCommon("interval")}
              >
                <option value="today">{tCommon("todayShort")}</option>
                <option value="days7">{tCommon("sevenDaysShort")}</option>
                <option value="days15">{tCommon("fifteenDaysShort")}</option>
                <option value="days30">{tCommon("thirtyDaysShort")}</option>
                <option value="quarter">{tCommon("quarterShort")}</option>
              </select>
            </div>

            {/* Period title with date input for jumping */}
            <div className="gantt-compact-toolbar__period">
              <button
                type="button"
                className="gantt-compact-toolbar__nav-btn"
                onClick={() => navigatePeriod(-1)}
                aria-label={tCommon("goBackBy", { period: activePeriodStep.aria })}
              >
                ‹
              </button>
              <label className="gantt-compact-toolbar__date-label">
                <span className="gantt-compact-toolbar__title capitalize">{viewRange.title}</span>
                <input
                  type="date"
                  className="gantt-compact-toolbar__date-input"
                  value={firstIso}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const d = parseIso(e.target.value);
                    pushCalendarPatch({
                      y: d.getFullYear(),
                      m: d.getMonth(),
                      ws: e.target.value,
                    });
                  }}
                  aria-label={tCommon("alignToday")}
                />
              </label>
              <button
                type="button"
                className="gantt-compact-toolbar__nav-btn"
                onClick={() => navigatePeriod(1)}
                aria-label={tCommon("goForwardBy", { period: activePeriodStep.aria })}
              >
                ›
              </button>
            </div>

            {/* Today button */}
            <button
              type="button"
              className={`gantt-compact-toolbar__today-btn ${isTodayStartMode ? "gantt-compact-toolbar__today-btn--active" : ""}`}
              onClick={toggleTodayStartMode}
              title={tCommon("alignToday")}
            >
              {tCommon("todayShort")}
            </button>
          </div>

          {/* RIGHT — display dropdown + heatmap + filter */}
          <div className="gantt-compact-toolbar__right">
            <div className="gantt-compact-toolbar__dropdown-wrap">
              <select
                className="gantt-compact-toolbar__select"
                value={layerFilter}
                onChange={(e) => pushCalendarPatch({ layer: e.target.value as GanttLayerFilter })}
                aria-label={tCommon("display")}
              >
                <option value="all">{tLayers("all")}</option>
                <option value="cereri">{tLayers("cereri")}</option>
                <option value="confirmate">{tLayers("confirmate")}</option>
                <option value="in_house">{tLayers("in_house")}</option>
                <option value="trecute">{tLayers("trecute")}</option>
                <option value="hold">{tLayers("hold")}</option>
                <option value="block">{tLayers("block")}</option>
              </select>
            </div>

            <button
              type="button"
              className={`gantt-compact-toolbar__icon-btn ${isAvailabilityPanelOpen ? "gantt-compact-toolbar__icon-btn--active" : ""}`}
              onClick={toggleAvailabilityPanel}
              aria-label={tCommon("heatmap")}
              title={tCommon("openHeatmapFloating")}
            >
              <HudIconGrid className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              className={`gantt-compact-toolbar__icon-btn ${(isFiltersOpen || hasActiveFilters) ? "gantt-compact-toolbar__icon-btn--active" : ""}`}
              onClick={(event) => {
                setFiltersAnchorRect(event.currentTarget.getBoundingClientRect());
                setIsFiltersOpen((prev) => !prev);
              }}
              aria-label={tCommon("filters")}
              title={tCommon("roomsAndOptions")}
            >
              <ToolbarFilterIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── Filters floating panel ─────────────────────────────── */}
        <AdminFloatingPanel
          open={isFiltersOpen}
          onClose={() => {
            setIsFiltersOpen(false);
            setFiltersAnchorRect(null);
          }}
          title={tCommon("filters")}
          anchorRect={filtersAnchorRect}
          width={360}
          className="gantt-filters-panel"
        >
          <div className="space-y-4 p-1">
            <SegmentGroup
              label={tCommon("roomsLabel")}
              compact
              value={filter}
              onChange={(next) => {
                setIsFiltersOpen(false);
                setFiltersAnchorRect(null);
                pushCalendarPatch({
                  filter: next as GanttFilter,
                  fd: next === "free" ? focusDay || null : null,
                });
              }}
              options={[
                { value: "all", label: tCommon("all") },
                { value: "occupied", label: tCommon("occupied") },
                { value: "free", label: tCommon("free") },
              ]}
            />

            <SegmentGroup
              label={tCommon("filters")}
              compact
              value={selectedFeature}
              onChange={(next) => {
                setIsFiltersOpen(false);
                setFiltersAnchorRect(null);
                pushCalendarPatch({ feat: next as GanttFeatureFilter });
              }}
              options={[
                { value: "all", label: tCommon("all") },
                { value: "ac", label: tCommon("withAc") },
                { value: "fridge", label: tCommon("fridge") },
              ]}
            />
          </div>
        </AdminFloatingPanel>

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
            minWidth: `max(100%, calc(${ROOM_COL_W} + ${viewRange.days.length} * ${DAY_COL_MIN_W}))`,
          }}
        >
          <colgroup>
            <col style={{ width: ROOM_COL_W }} />
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
                  scrollTitle={tCommon("scrollDrag")}
                  todayLabel={tCommon("todayPanel")}
                  locale={locale}
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
            />
          </thead>
          <tbody>
            {groupByBuilding
              ? buildingGroups.map((group) => {
                  const collapsed = collapsedBuildings.has(group.buildingId);
                  const focused = focusBuildingId === group.buildingId;
                  const dimHeader =
                    focusBuildingId != null && !focused;
                  return (
                  <Fragment key={group.buildingId}>
                    <tr className="border-t border-zinc-200">
                      <td
                        colSpan={2}
                        className={[
                          "gantt-building-header px-2 py-1 text-left",
                          focused && "gantt-building-header--focused",
                          dimHeader && "gantt-building-header--dimmed",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={
                          {
                            "--marker-color": resolveGanttAcMarkerColor(
                              group.buildingAcMode,
                              {
                                buildingHasAnyRoomAc: group.hasAnyRoomAc,
                              }
                            ),
                          } as CSSProperties
                        }
                        onClick={() =>
                          setFocusBuildingId((prev) =>
                            prev === group.buildingId ? null : group.buildingId
                          )
                        }
                      >
                        <div className="gantt-building-header__inner flex items-center gap-1.5">
                          <button
                            type="button"
                            className={[
                              "gantt-building-header__chevron",
                              collapsed
                                ? "gantt-building-header__chevron--closed"
                                : "gantt-building-header__chevron--open",
                            ].join(" ")}
                            aria-expanded={!collapsed}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCollapsedBuildings((prev) => {
                                const next = new Set(prev);
                                if (next.has(group.buildingId)) {
                                  next.delete(group.buildingId);
                                } else {
                                  next.add(group.buildingId);
                                }
                                return next;
                              });
                            }}
                          >
                            ▾
                          </button>
                          <GanttBuildingMarker
                            acMode={group.buildingAcMode}
                            size="sm"
                            buildingHasAnyRoomAc={group.hasAnyRoomAc}
                          />
                          <span className="gantt-building-header__title">
                            {group.buildingName}
                          </span>
                          <span className="gantt-building-header__count">
                            {group.rooms.length}{" "}
                            {group.rooms.length === 1 ? tCommon("room") : tCommon("rooms")}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {!collapsed &&
                      group.rooms.map((room) => (
                      <GanttRoomRow
                        key={room.id}
                        room={room}
                        viewRange={viewRange}
                        occupancyByRoom={occupancyByRoom}
                        staySegments={displaySegmentsByRoom.stay.get(room.id) ?? []}
                        overlays={displaySegmentsByRoom.overlay.get(room.id) ?? []}
                        checkInTime={checkInTime}
                        checkOutTime={checkOutTime}
                        compact={compact}
                        touch={touch}
                        dimmed={
                          focusBuildingId != null &&
                          room.building_id !== focusBuildingId
                        }
                        todayFlags={todayFlagsByRoom.get(room.id) ?? {
                          arrival: false,
                          departure: false,
                          occupiedTonight: false,
                        }}
                        onOccOpen={handleOccOpen}
                        bookingById={bookingById}
                        onMoveRoom={setMoveRoomDraft}
                        onCreateDraft={handleCreateDraftWithPinnedClear}
                        pinnedSelection={pinnedSelection}
                        onCtrlDragEnd={handleCtrlDragEnd}
                        today={effectiveToday}
                      />
                    ))}
                  </Fragment>
                  );
                })
              : filteredRooms.map((room) => (
                  <GanttRoomRow
                    key={room.id}
                    room={room}
                    viewRange={viewRange}
                    occupancyByRoom={occupancyByRoom}
                    staySegments={displaySegmentsByRoom.stay.get(room.id) ?? []}
                    overlays={displaySegmentsByRoom.overlay.get(room.id) ?? []}
                    checkInTime={checkInTime}
                    checkOutTime={checkOutTime}
                    compact={compact}
                    touch={touch}
                    todayFlags={todayFlagsByRoom.get(room.id) ?? {
                      arrival: false,
                      departure: false,
                      occupiedTonight: false,
                    }}
                    onOccOpen={handleOccOpen}
                    bookingById={bookingById}
                    onMoveRoom={setMoveRoomDraft}
                    onCreateDraft={handleCreateDraftWithPinnedClear}
                    pinnedSelection={pinnedSelection}
                    onCtrlDragEnd={handleCtrlDragEnd}
                    today={effectiveToday}
                  />
                ))}
            {filteredRooms.length === 0 && (
              <tr>
                <td
                  colSpan={2}
                  className="px-4 py-12 text-center text-sm text-zinc-500"
                >
                  {filter !== "all"
                    ? tCommon("noRoomForFilterTryAll")
                    : tCommon("noRoomForFilter")}
                </td>
              </tr>
            )}
          </tbody>
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
      <GanttContextMenuPanel />
      <GanttOpsPickerPanel
        open={opsPickerMode !== null}
        mode={opsPickerMode ?? "checkin"}
        bookings={activeBookings}
        onClose={() => setOpsPickerMode(null)}
        today={effectiveToday}
        onSelect={(b) => {
          if (!opsPickerMode) return;
          setOpsCheckDialog({
            mode: opsPickerMode,
            bookingId: b.id,
            guestName: b.guest_name,
            plannedCheckIn: b.check_in,
            plannedCheckOut: b.check_out,
          });
        }}
      />
      {opsCheckDialog && (
        <GanttCheckTimeDialog
          open
          mode={opsCheckDialog.mode}
          bookingId={opsCheckDialog.bookingId}
          guestName={opsCheckDialog.guestName}
          plannedCheckIn={opsCheckDialog.plannedCheckIn}
          plannedCheckOut={opsCheckDialog.plannedCheckOut}
          onClose={() => setOpsCheckDialog(null)}
          onSuccess={() => router.refresh()}
        />
      )}
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
      <GanttOccupancyDetailPanel
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
  );
}
