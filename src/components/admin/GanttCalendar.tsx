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
  type RefObject,
} from "react";
import { useSearchParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation";
import { buildCalendarQuery } from "@/lib/gantt-query";
import { mergeAvailabilityPanelSearch } from "@/lib/availability-panel-query";
import {
  formatDateWithDay,
  formatWeekdayNarrow,
  formatWeekdayShort,
} from "@/lib/ro-calendar";
import { GanttDailySummaryRow } from "@/components/admin/gantt/GanttDailySummaryRow";
import {
  type DailyFreeCount,
  computeDailyFreeCounts,
  dailyFreeHeatLevel,
} from "@/domain/gantt/daily-free-counts";
import { guestInitials } from "@/domain/guest-name";
import { resolveGanttBuildingColor } from "@/lib/building-color-palette";
import { useIsTouchDevice } from "@/hooks/useDeviceClass";
import type { BookingRow } from "@/services/bookings";
import { formatGuestGanttLabel } from "@/domain/guest-name";
import { bookingBarInRange } from "@/domain/gantt/bar-position";
import {
  filterOccupancyForLayer,
  type GanttLayerFilter,
} from "@/domain/gantt/occupancy-layer";
import { occupancyPhase } from "@/domain/occupancy/phase";
import type { OccupancySegment } from "@/domain/occupancy/types";
import { ganttDayTimeStyle } from "@/lib/gantt-time";
import type { GanttFilter } from "@/domain/gantt/filters";
import { focusDayInRange } from "@/domain/gantt/filters";
import type { GanttRoom } from "@/domain/gantt/types";
import { RoomFeatureBadges } from "@/components/admin/catalog/RoomFeatureBadges";
import type { GanttViewRange } from "@/domain/gantt/view-range";
import { guestPartyTotal } from "@/lib/guest-party";
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
} from "@/lib/constants";
import { GanttDraggableStay } from "@/components/admin/gantt/GanttDraggableStay";
import { GanttDragCreateLayer } from "@/components/admin/gantt/GanttDragCreateLayer";
import { GanttPinnedSelectionChip } from "@/components/admin/gantt/GanttPinnedSelectionChip";
import type { PinnedSelection } from "@/domain/gantt/pinned-selection";
import {
  setGanttRoomPinnedSpan,
  clearGanttRoomPinnedSpan,
} from "@/domain/gantt/room-at-point";
import { ghostBarPosition } from "@/domain/gantt/drag-create";
import { GanttOccupancyBar } from "@/components/admin/gantt/GanttOccupancyBar";
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
  type GanttCreateDraft,
} from "@/components/admin/gantt/GanttCreateDialog";
import { GanttContextMenuProvider } from "@/components/admin/gantt/GanttContextMenuContext";
import { GanttContextMenuPanel } from "@/components/admin/gantt/GanttContextMenuPanel";
import { GanttContextMenuBridge } from "@/components/admin/gantt/GanttContextMenuBridge";
import type { GanttCreateDraftRequest } from "@/domain/gantt/context-menu";
import {
  GanttBuildingMarker,
  GanttRoomMarker,
} from "@/components/admin/gantt/GanttBuildingMarker";
import { resolveGanttAcMarkerColor } from "@/lib/gantt-ac-marker";
import { GanttRadialController } from "@/components/admin/gantt/GanttRadialController";
import { GanttCheckTimeDialog } from "@/components/admin/gantt/GanttCheckTimeDialog";
import {
  GanttOpsPickerPanel,
  type GanttOpsPickerMode,
} from "@/components/admin/gantt/GanttOpsPickerPanel";
import { GanttToolbarOccForm } from "@/components/admin/gantt/GanttToolbarOccForm";
import { AdminPortal } from "@/components/admin/overlay/AdminPortal";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import {
  type RoomTodayFlags,
  stayTodayHighlight,
  summarizeGanttToday,
} from "@/domain/gantt/today-activity";
import type { GanttZoom } from "@/domain/gantt/view-range";
import { navigateRange } from "@/domain/gantt/view-range";
import { addDays, nightOccupied, parseIso, todayIso } from "@/lib/stay-dates";
import type { GanttFeatureFilter } from "@/domain/gantt/filters";
import { SegmentGroup } from "@/components/admin/gantt/GanttToolbar";
import { HudIconCalendar, HudIconGrid } from "@/components/admin/AdminHudIcons";
import { useLocale, useTranslations } from "next-intl";

export type { GanttRoom };

const ROOM_COL_W = "7.7rem";
const DAY_COL_MIN_W = "2.25rem";

const GANTT_DAY_CELL =
  "gantt-day-cell min-w-0 bg-white shadow-[inset_0_0_0_1px_#d4d4d8]";

type InlineZoomChoice = "today" | "days7" | "days15" | "days30" | "quarter";

const QUICK_SHIFT_STEPS = [{ days: 1 }, { days: 7 }, { days: 15 }, { days: 30 }] as const;

function ToolbarFilterIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 6h12" />
      <path d="M6.5 10h7" />
      <path d="M8.5 14h3" />
      <circle cx="6.5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="14" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

type StickyViewportState = {
  active: boolean;
  left: number;
  width: number;
  roomColumnWidth: number;
  daysContentWidth: number;
  scrollLeft: number;
};

function normalizeZoomChoice(zoom: GanttZoom): InlineZoomChoice {
  if (zoom === "week") return "days7";
  if (zoom === "month") return "days30";
  if (zoom === "today" || zoom === "days7" || zoom === "days15" || zoom === "days30") {
    return zoom;
  }
  return "quarter";
}

function periodStepMeta(
  zoom: InlineZoomChoice,
  tCommon: (key: string) => string
): { label: string; aria: string } {
  switch (zoom) {
    case "today":
      return { label: tCommon("stepOneDay"), aria: tCommon("oneDayAria") };
    case "days7":
      return { label: tCommon("stepOneWeek"), aria: tCommon("oneWeekAria") };
    case "days15":
      return { label: tCommon("stepFifteenDays"), aria: tCommon("fifteenDaysAria") };
    case "days30":
      return { label: tCommon("stepOneMonth"), aria: tCommon("oneMonthAria") };
    case "quarter":
      return { label: tCommon("stepOneQuarter"), aria: tCommon("oneQuarterAria") };
  }
}

function quickShiftMeta(
  days: number,
  tCommon: (key: string) => string
): { label: string; shortLabel: string } {
  if (days === 1) return { label: tCommon("oneDayAria"), shortLabel: "1d" };
  if (days === 7) return { label: tCommon("oneWeekAria"), shortLabel: "1w" };
  if (days === 15) return { label: tCommon("fifteenDaysAria"), shortLabel: "15d" };
  return { label: tCommon("oneMonthAria"), shortLabel: "30d" };
}

function ganttDayGridStyle(dayCount: number): CSSProperties {
  return {
    gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))`,
  };
}

function dayCellClass(
  col: { isWeekend: boolean; isToday: boolean },
  compact: boolean,
  touch: boolean
) {
  return [
    GANTT_DAY_CELL,
    compact && "gantt-day-cell--compact",
    touch && "gantt-day-cell--touch",
    col.isWeekend && "gantt-day-cell--weekend",
    col.isToday && "gantt-day-cell--today",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Header zile — fără zone/hasură din grila de cazare */
function dayHeaderCellClass(
  col: { isWeekend: boolean; isToday: boolean },
  compact: boolean
) {
  return [
    "gantt-day-header-cell min-w-0",
    compact && "gantt-day-header-cell--compact",
    col.isWeekend && "gantt-day-header-cell--weekend",
    col.isToday && "gantt-day-header-cell--today",
  ]
    .filter(Boolean)
    .join(" ");
}

function DayGrid({
  columns,
  compact,
  touch,
  checkInTime,
  checkOutTime,
}: {
  columns: GanttViewRange["days"];
  compact: boolean;
  touch: boolean;
  checkInTime: string;
  checkOutTime: string;
}) {
  return (
    <div
      className="gantt-day-grid gantt-day-grid--timed grid h-full w-full min-w-0 bg-white shadow-[inset_1px_0_0_0_#d4d4d8]"
      style={{
        ...ganttDayGridStyle(columns.length),
        ...ganttDayTimeStyle(checkInTime, checkOutTime),
      }}
    >
      {columns.map((col) => (
        <div key={col.iso} className={dayCellClass(col, compact, touch)} />
      ))}
    </div>
  );
}

function DayHeader({
  columns,
  compact,
  onPanPointerDown,
  panActive = false,
  scrollTitle,
  todayLabel,
  locale,
}: {
  columns: GanttViewRange["days"];
  compact: boolean;
  onPanPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  panActive?: boolean;
  scrollTitle: string;
  todayLabel: string;
  locale: string;
}) {
  return (
    <div
      className={[
        "gantt-day-header-grid grid w-full min-w-0 border-b border-zinc-300 bg-gradient-to-b from-slate-50 to-zinc-100/90",
        "gantt-day-header-grid--pan",
        panActive && "gantt-day-header-grid--panning",
      ]
        .filter(Boolean)
        .join(" ")}
      style={ganttDayGridStyle(columns.length)}
      data-gantt-day-grid=""
      data-gantt-day-count={columns.length}
      onPointerDown={onPanPointerDown}
      title={scrollTitle}
    >
      {columns.map((col) => (
        <div key={col.iso} className="gantt-day-header-col flex min-w-0 flex-col">
          <span
            className={[
              "gantt-day-azi-above",
              !col.isToday && "invisible",
            ].join(" ")}
            aria-hidden={!col.isToday}
          >
            {todayLabel}
          </span>
          <div
            className={[
              dayHeaderCellClass(col, compact),
              "gantt-day-header-cell__body flex flex-1 flex-col items-center justify-center text-center leading-tight",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="gantt-day-header-cell__date tabular-nums">
              {col.dayNum}
            </span>
            <span className="gantt-day-header-cell__weekday">
              {compact
                ? formatWeekdayNarrow(col.iso, locale)
                : formatWeekdayShort(col.iso, locale)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryGrid({
  counts,
  viewRange,
  compact,
  activeFocusIso,
  filterActive,
  onDayClick,
  onPanPointerDown,
  panActive = false,
  ariaLabel,
  scrollTitle,
  dayTitle,
  dayAriaLabel,
}: {
  counts: DailyFreeCount[];
  viewRange: GanttViewRange;
  compact: boolean;
  activeFocusIso: string | null;
  filterActive: boolean;
  onDayClick: (iso: string) => void;
  onPanPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  panActive?: boolean;
  ariaLabel: string;
  scrollTitle: string;
  dayTitle: (iso: string, free: number, total: number) => string;
  dayAriaLabel: (iso: string, free: number) => string;
}) {
  return (
    <div
      className={[
        "gantt-summary-row__grid grid w-full min-w-0",
        "gantt-summary-row__grid--pan",
        panActive && "gantt-summary-row__grid--panning",
      ]
        .filter(Boolean)
        .join(" ")}
      style={ganttDayGridStyle(viewRange.days.length)}
      role="row"
      aria-label={ariaLabel}
      onPointerDown={onPanPointerDown}
      title={scrollTitle}
    >
      {viewRange.days.map((col, i) => {
        const { free, total } = counts[i]!;
        const heat = dailyFreeHeatLevel(free, total);
        const isSelected = filterActive && activeFocusIso === col.iso;
        const title = dayTitle(col.iso, free, total);

        return (
          <button
            key={col.iso}
            type="button"
            title={title}
            aria-pressed={isSelected}
            aria-label={dayAriaLabel(col.iso, free)}
            onClick={() => onDayClick(col.iso)}
            className={[
              "gantt-summary-cell min-w-0 border-r border-zinc-100/80 transition",
              compact ? "gantt-summary-cell--compact py-[0.25rem]" : "py-[0.36rem]",
              col.isWeekend && "gantt-summary-cell--weekend",
              col.isToday && "gantt-summary-cell--today",
              `gantt-summary-cell--${heat}`,
              isSelected && "gantt-summary-cell--selected",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="gantt-summary-cell__value tabular-nums">{free}</span>
          </button>
        );
      })}
    </div>
  );
}

function StickyViewportHeader({
  scrollRef,
  shellRef,
  theadRef,
  counts,
  viewRange,
  compact,
  activeFocusIso,
  filterActive,
  onDayClick,
  onPanPointerDown,
  panActive,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
  shellRef: RefObject<HTMLDivElement | null>;
  theadRef: RefObject<HTMLTableSectionElement | null>;
  counts: DailyFreeCount[];
  viewRange: GanttViewRange;
  compact: boolean;
  activeFocusIso: string | null;
  filterActive: boolean;
  onDayClick: (iso: string) => void;
  onPanPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  panActive?: boolean;
}) {
  const tCommon = useTranslations("admin.common");
  const locale = useLocale();
  const [state, setState] = useState<StickyViewportState>({
    active: false,
    left: 0,
    width: 0,
    roomColumnWidth: 0,
    daysContentWidth: 0,
    scrollLeft: 0,
  });

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const shell = shellRef.current;
    const thead = theadRef.current;
    if (!scrollEl || !shell || !thead) return;

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scrollRect = scrollEl.getBoundingClientRect();
        const shellRect = shell.getBoundingClientRect();
        const theadRect = thead.getBoundingClientRect();
        const roomHeader =
          thead.querySelector<HTMLTableCellElement>(".gantt-head-main-row__room");
        const roomColumnWidth = roomHeader?.getBoundingClientRect().width ?? 0;
        const daysContentWidth = Math.max(0, scrollEl.scrollWidth - roomColumnWidth);
        const next: StickyViewportState = {
          active:
            theadRect.top <= 0 && shellRect.bottom > Math.max(theadRect.height, 1),
          left: scrollRect.left,
          width: scrollRect.width,
          roomColumnWidth,
          daysContentWidth,
          scrollLeft: scrollEl.scrollLeft,
        };

        setState((prev) =>
          prev.active === next.active &&
          prev.left === next.left &&
          prev.width === next.width &&
          prev.roomColumnWidth === next.roomColumnWidth &&
          prev.daysContentWidth === next.daysContentWidth &&
          prev.scrollLeft === next.scrollLeft
            ? prev
            : next
        );
      });
    };

    update();
    scrollEl.addEventListener("scroll", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(frame);
      scrollEl.removeEventListener("scroll", update);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [scrollRef, shellRef, theadRef, viewRange.periodKey, compact, counts.length]);

  if (
    !state.active ||
    state.width <= 0 ||
    state.daysContentWidth <= 0 ||
    state.roomColumnWidth <= 0
  ) {
    return null;
  }

  return (
    <AdminPortal>
      <div
        className="gantt-viewport-header"
        style={{ left: state.left, width: state.width }}
        aria-hidden={false}
      >
        <div className="gantt-viewport-header__row gantt-viewport-header__row--main">
          <div
            className="gantt-head-main-row__room gantt-room-column-header gantt-viewport-header__room px-3 py-[0.72rem]"
            style={{ width: state.roomColumnWidth }}
          >
            {tCommon("room")}
          </div>
          <div className="gantt-viewport-header__days-viewport">
            <div
              className="gantt-viewport-header__days-inner"
              style={{
                width: state.daysContentWidth,
                transform: `translateX(-${state.scrollLeft}px)`,
              }}
            >
              <div className="gantt-head-main-row__days">
                <DayHeader
                  columns={viewRange.days}
                  compact={compact}
                  onPanPointerDown={onPanPointerDown}
                  panActive={panActive}
                  scrollTitle={tCommon("scrollDrag")}
                  todayLabel={tCommon("todayPanel")}
                  locale={locale}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="gantt-viewport-header__row gantt-viewport-header__row--summary">
          <div
            className="gantt-summary-row__label gantt-viewport-header__summary-label"
            style={{ width: state.roomColumnWidth }}
          >
            <span className="gantt-summary-row__label-title">
              {tCommon("free")}
            </span>
            {filterActive && activeFocusIso && (
              <span className="gantt-summary-row__label-state">
                {tCommon("activeFilter")}
              </span>
            )}
          </div>
          <div className="gantt-viewport-header__days-viewport">
            <div
              className="gantt-viewport-header__days-inner"
              style={{
                width: state.daysContentWidth,
                transform: `translateX(-${state.scrollLeft}px)`,
              }}
            >
              <div className="gantt-summary-row__days">
                <SummaryGrid
                  counts={counts}
                  viewRange={viewRange}
                  compact={compact}
                  activeFocusIso={activeFocusIso}
                  filterActive={filterActive}
                  onDayClick={onDayClick}
                  onPanPointerDown={onPanPointerDown}
                  panActive={panActive}
                  ariaLabel={tCommon("freeRoomsByDay")}
                  scrollTitle={tCommon("scrollDrag")}
                  dayTitle={(iso, free, total) =>
                    total === 0 ? iso : tCommon("freeRoomsFilterTitle", { count: free })
                  }
                  dayAriaLabel={(iso, free) =>
                    tCommon("freeRoomsForDate", { iso, count: free })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminPortal>
  );
}

function RoomRow({
  room,
  viewRange,
  occupancyByRoom,
  staySegments,
  overlays,
  checkInTime,
  checkOutTime,
  compact,
  touch,
  dimmed,
  todayFlags,
  onOccOpen,
  bookingById,
  onMoveRoom,
  onCreateDraft,
  pinnedSelection,
  onCtrlDragEnd,
  today,
}: {
  room: GanttRoom;
  viewRange: GanttViewRange;
  occupancyByRoom: Map<string, OccupancySegment[]>;
  staySegments: OccupancySegment[];
  overlays: OccupancySegment[];
  checkInTime: string;
  checkOutTime: string;
  compact: boolean;
  touch: boolean;
  dimmed?: boolean;
  todayFlags: RoomTodayFlags;
  onOccOpen: (seg: OccupancySegment, roomName: string) => void;
  bookingById: Map<string, BookingRow>;
  onMoveRoom: (draft: MoveRoomDraft) => void;
  onCreateDraft: (draft: GanttCreateDraft) => void;
  pinnedSelection?: PinnedSelection | null;
  onCtrlDragEnd?: (roomIds: string[], checkIn: string, checkOut: string) => void;
  today: string;
}) {
  const tCommon = useTranslations("admin.common");
  const tLayers = useTranslations("admin.gantt.layers");
  const dayCount = viewRange.days.length;

  const roomColor = resolveGanttBuildingColor(
    room.building_color,
    room.building_ac_mode
  );
  const sidebarMarkerColor = resolveGanttAcMarkerColor(room.building_ac_mode, {
    roomHasAc: room.has_ac,
  });

  const rowTodayClass = [
    todayFlags.arrival && "gantt-room-row--arrival-today",
    todayFlags.departure && "gantt-room-row--departure-today",
    todayFlags.occupiedTonight &&
      !todayFlags.arrival &&
      !todayFlags.departure &&
      "gantt-room-row--in-house",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <tr
      data-gantt-room-row={room.id}
      data-gantt-room-name={room.name}
      className={[
        "gantt-room-row border-t border-zinc-300",
        rowTodayClass,
        dimmed && "gantt-room-row--dimmed",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <td
        className="gantt-room-cell sticky left-0 z-10 px-2 py-[0.45rem] align-top"
        style={{ "--marker-color": sidebarMarkerColor } as CSSProperties}
      >
        <div className="flex items-start gap-1.5">
          <GanttRoomMarker
            acMode={room.building_ac_mode}
            size="sm"
            roomHasAc={room.has_ac}
          />
          <div className="gantt-room-cell__text min-w-0">
            <span className="gantt-room-cell__name">{room.name}</span>
            <span className="gantt-room-cell__building">{room.building_name}</span>
            <RoomFeatureBadges
              roomTypeName={room.room_type_name}
              optionSlugs={room.option_slugs}
              hasAc={room.has_ac}
              compact
              iconOnly
              hideRoomType
            />
            {(todayFlags.arrival || todayFlags.departure) && (
              <span className="gantt-room-today-badges mt-1 flex flex-wrap gap-1">
                {todayFlags.arrival && (
                  <span className="gantt-room-today-badge gantt-room-today-badge--in">
                    Sosire azi
                  </span>
                )}
                {todayFlags.departure && (
                  <span className="gantt-room-today-badge gantt-room-today-badge--out">
                    Plecare azi
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="relative w-full overflow-visible p-0 align-top">
        <GanttDragCreateLayer
          roomId={room.id}
          roomName={room.name}
          viewRange={viewRange}
          occupancyByRoom={occupancyByRoom}
          checkInTime={checkInTime}
          checkOutTime={checkOutTime}
          touch={touch}
          onCreateDraft={onCreateDraft}
          pinnedSelection={pinnedSelection}
          onCtrlDragEnd={onCtrlDragEnd}
          renderGrid={
            <DayGrid
              columns={viewRange.days}
              compact={compact}
              touch={touch}
              checkInTime={checkInTime}
              checkOutTime={checkOutTime}
            />
          }
        >
          {overlays.map((seg) => {
            const pos = bookingBarInRange(
              seg.checkIn,
              seg.checkOut,
              viewRange.rangeStart,
              viewRange.rangeEnd,
              dayCount,
              checkInTime,
              checkOutTime
            );
            if (!pos || pos.widthPct <= 0) return null;
            const label =
              seg.kind === "hold"
                ? seg.reason?.trim() || tLayers("hold")
                : seg.reason?.trim() || tCommon("blocked");
            const title =
              seg.kind === "hold"
                ? tCommon("holdTitleRange", {
                    label,
                    checkIn: seg.checkIn,
                    checkOut: seg.checkOut,
                  })
                : tCommon("blockTitleRange", {
                    label,
                    checkIn: seg.checkIn,
                    checkOut: seg.checkOut,
                  });
            return (
              <GanttOccupancyBar
                key={`${seg.kind}-${seg.id}`}
                label={label}
                title={title}
                pos={pos}
                kind={seg.kind as "hold" | "block"}
                segment={seg}
                roomName={room.name}
                expiresAt={seg.expiresAt}
                onOpen={() => onOccOpen(seg, room.name)}
              />
            );
          })}
          {staySegments.map((seg) => {
            const b = seg.bookingId ? bookingById.get(seg.bookingId) : undefined;
            if (!b) return null;
            const pos = bookingBarInRange(
              seg.checkIn,
              seg.checkOut,
              viewRange.rangeStart,
              viewRange.rangeEnd,
              dayCount,
              checkInTime,
              checkOutTime
            );
            if (!pos || pos.widthPct <= 0) return null;
            const isCerere = b.status === "cerere_noua";
            const ganttLabel = formatGuestGanttLabel(
              b.guest_last_name,
              b.guest_first_name,
              b.guest_name
            );
            const guests = guestPartyTotal(b.num_adults, b.num_children);
            const todayHl = stayTodayHighlight(b, today);
            const initials = guestInitials(
              b.guest_last_name,
              b.guest_first_name,
              b.guest_name
            );
            const phase = seg.phase ?? occupancyPhase(seg.checkIn, seg.checkOut, today);
            const canMoveRoom =
              b.status === "confirmata" && phase !== "past";
            const moveDraft: MoveRoomDraft | null = canMoveRoom
              ? {
                  bookingId: b.id,
                  guestName: b.guest_name,
                  sourceRoomId: room.id,
                  sourceRoomName: room.name,
                  roomIds: b.room_ids,
                }
              : null;
            return (
              <GanttDraggableStay
                key={`${seg.id}-${room.id}`}
                href={`/admin/bookings/${b.id}`}
                label={ganttLabel}
                pos={pos}
                isCerere={isCerere}
                guestTotal={guests}
                bookingId={b.id}
                dayIsos={viewRange.days.map((day) => day.iso)}
                bookingCheckIn={b.check_in}
                buildingColor={roomColor}
                todayHighlight={todayHl}
                initials={initials}
                occupancyPhase={phase}
                guestId={b.guest_id}
                sourceRoomId={room.id}
                canVerticalMove={canMoveRoom}
                moveRoomDraft={moveDraft}
                onMoveRoom={
                  moveDraft
                    ? () => onMoveRoom(moveDraft)
                    : undefined
                }
                actualCheckInAt={b.actual_check_in_at}
                actualCheckOutAt={b.actual_check_out_at}
                today={today}
                popover={{
                  bookingId: b.id,
                  guestName: b.guest_name,
                  label: ganttLabel,
                  checkIn: seg.checkIn,
                  checkOut: seg.checkOut,
                  status: b.status as "cerere_noua" | "confirmata",
                  actualCheckInAt: b.actual_check_in_at,
                  actualCheckOutAt: b.actual_check_out_at,
                  numAdults: b.num_adults,
                  numChildren: b.num_children,
                  checkInTime,
                  checkOutTime,
                  continuesBefore: pos.continuesBefore,
                  continuesAfter: pos.continuesAfter,
                  buildingColor: roomColor,
                  roomId: room.id,
                  roomName: room.name,
                  roomNames: b.room_names,
                  guestPhone: b.guest_phone,
                  totalPrice: b.total_price,
                  canMoveRoom,
                  onMoveRoom: moveDraft
                    ? () => onMoveRoom(moveDraft)
                    : undefined,
                }}
              />
            );
          })}
        </GanttDragCreateLayer>
      </td>
    </tr>
  );
}

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
}) {
  const effectiveToday = todayProp ?? todayIso();
  const tCommon = useTranslations("admin.common");
  const tLayers = useTranslations("admin.gantt.layers");
  const tGantt = useTranslations("admin.gantt");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const touch = useIsTouchDevice();
  const compact = viewRange.zoom === "quarter" || touch;
  const dayIsos = useMemo(() => viewRange.days.map((d) => d.iso), [viewRange.days]);
  const defaultFocusIso = focusDayInRange(dayIsos, effectiveToday);
  const focusIso =
    filter !== "all" && focusDay ? focusDay : defaultFocusIso;
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
  const [isHeaderPanActive, setIsHeaderPanActive] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filtersAnchorRect, setFiltersAnchorRect] = useState<DOMRect | null>(null);

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

  const shiftGrid = useCallback(
    (days: number) => {
      const nextStart = addDays(firstIso, days);
      const nextDate = parseIso(nextStart);
      pushCalendarPatch({
        y: nextDate.getFullYear(),
        m: nextDate.getMonth(),
        ws: nextStart,
        q: viewRange.zoom === "quarter" ? Math.floor(nextDate.getMonth() / 3) : undefined,
      });
    },
    [firstIso, pushCalendarPatch, viewRange.zoom]
  );

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
      <StickyViewportHeader
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
        <div className="gantt-inline-controls mx-3 mt-0">
          <div className="gantt-inline-controls__row gantt-inline-controls__row--primary">
            <div className="gantt-inline-controls__center">
              <GanttRadialController
                onOpenRequest={() => setOccFormMode("cerere")}
                onOpenHold={() => setOccFormMode("hold")}
                onOpenMove={() => setOccFormMode("move")}
                onOpenBlock={() => setOccFormMode("block")}
                onOpenReception={() => setOccFormMode("direct")}
                onOpenCheckIn={() => setOpsPickerMode("checkin")}
                onOpenCheckOut={() => setOpsPickerMode("checkout")}
              />
            </div>

            <div className="gantt-inline-controls__primary-section gantt-inline-controls__primary-section--rooms">
              <button
                type="button"
                className={[
                  "gantt-toolbar__edge-anchor",
                  "gantt-toolbar__filters-anchor",
                  "gantt-toolbar__filters-anchor--icon",
                  (isFiltersOpen || hasActiveFilters) && "gantt-toolbar__edge-anchor--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={(event) => {
                  setFiltersAnchorRect(event.currentTarget.getBoundingClientRect());
                  setIsFiltersOpen((prev) => !prev);
                }}
                aria-label={tCommon("filters")}
                title={tCommon("roomsAndOptions")}
              >
                <ToolbarFilterIcon className="gantt-toolbar__filters-icon" />
              </button>
            </div>
          </div>

          <div className="gantt-inline-controls__row gantt-inline-controls__row--navigator">
            <div className="gantt-inline-controls__navigator-band">
              <div className="gantt-inline-controls__side-dock gantt-inline-controls__side-dock--left">
                <SegmentGroup
                  label={tCommon("interval")}
                  compact
                  inline
                  forceShortLabels
                  value={zoomChoice}
                  onChange={(next) => handleInlineZoomChange(next as InlineZoomChoice)}
                  options={[
                    { value: "today", label: tCommon("todayPanel"), shortLabel: tCommon("todayShort") },
                    { value: "days7", label: tCommon("sevenDays"), shortLabel: tCommon("sevenDaysShort") },
                    { value: "days15", label: tCommon("fifteenDays"), shortLabel: tCommon("fifteenDaysShort") },
                    { value: "days30", label: tCommon("thirtyDays"), shortLabel: tCommon("thirtyDaysShort") },
                    { value: "quarter", label: tCommon("quarter"), shortLabel: tCommon("quarterShort") },
                  ]}
                />
                <button
                  type="button"
                  className={[
                    "gantt-toolbar__edge-anchor",
                    "gantt-toolbar__gap-anchor",
                    "gantt-toolbar__gap-anchor--icon",
                    isTodayStartMode && "gantt-toolbar__edge-anchor--active",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={toggleTodayStartMode}
                  aria-label={tCommon("todayAtStart")}
                  title={tCommon("alignToday")}
                >
                  <HudIconCalendar className="gantt-toolbar__gap-icon" />
                </button>
              </div>

              <div className="gantt-inline-controls__navigator-main">
              <div className="gantt-toolbar__period-shell gantt-toolbar__period-shell--hero">
                <div className="gantt-toolbar__period gantt-toolbar__period--hero">
                  <div
                    className="gantt-toolbar__quick-jumps gantt-toolbar__quick-jumps--back"
                    aria-label={tCommon("quickJumpBack")}
                  >
                    {QUICK_SHIFT_STEPS.map((step) => {
                      const meta = quickShiftMeta(step.days, tCommon);
                      return (
                      <button
                        key={`back-${step.days}`}
                        type="button"
                        className="gantt-toolbar__jump-btn"
                        aria-label={tCommon("goBackBy", { period: meta.label })}
                        title={tCommon("goBackBy", { period: meta.label })}
                        onClick={() => shiftGrid(-step.days)}
                      >
                        <span className="gantt-toolbar__jump-arrow" aria-hidden>
                          ←
                        </span>
                        <span className="gantt-toolbar__jump-label">{meta.shortLabel}</span>
                      </button>
                    )})}
                  </div>

                  <button
                    type="button"
                    className="gantt-toolbar__nav"
                    aria-label={tCommon("goBackBy", { period: activePeriodStep.aria })}
                    title={tCommon("goBackBy", { period: activePeriodStep.label.toLowerCase() })}
                    onClick={() => navigatePeriod(-1)}
                  >
                    ←
                  </button>

                  <div className="gantt-toolbar__period-center">
                    <span className="gantt-toolbar__period-step">{activePeriodStep.label}</span>
                    <span className="gantt-toolbar__title capitalize">{viewRange.title}</span>
                  </div>

                  <button
                    type="button"
                    className="gantt-toolbar__nav"
                    aria-label={tCommon("goForwardBy", { period: activePeriodStep.aria })}
                    title={tCommon("goForwardBy", { period: activePeriodStep.label.toLowerCase() })}
                    onClick={() => navigatePeriod(1)}
                  >
                    →
                  </button>

                  <div
                    className="gantt-toolbar__quick-jumps gantt-toolbar__quick-jumps--forward"
                    aria-label={tCommon("quickJumpForward")}
                  >
                    {QUICK_SHIFT_STEPS.map((step) => {
                      const meta = quickShiftMeta(step.days, tCommon);
                      return (
                      <button
                        key={`forward-${step.days}`}
                        type="button"
                        className="gantt-toolbar__jump-btn"
                        aria-label={tCommon("goForwardBy", { period: meta.label })}
                        title={tCommon("goForwardBy", { period: meta.label })}
                        onClick={() => shiftGrid(step.days)}
                      >
                        <span className="gantt-toolbar__jump-label">{meta.shortLabel}</span>
                        <span className="gantt-toolbar__jump-arrow" aria-hidden>
                          →
                        </span>
                      </button>
                    )})}
                  </div>
                </div>
              </div>
              </div>

              <div className="gantt-inline-controls__side-dock gantt-inline-controls__side-dock--right">
                <button
                  type="button"
                  className={[
                    "gantt-toolbar__edge-anchor",
                    "gantt-toolbar__gap-anchor",
                    "gantt-toolbar__gap-anchor--icon",
                    isAvailabilityPanelOpen && "gantt-toolbar__edge-anchor--active",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={toggleAvailabilityPanel}
                  aria-label={tCommon("heatmap")}
                  title={tCommon("openHeatmapFloating")}
                >
                  <HudIconGrid className="gantt-toolbar__gap-icon" />
                </button>
                <SegmentGroup
                  label={tCommon("display")}
                  compact
                  inline
                  forceShortLabels
                  value={layerFilter}
                  onChange={(next) => pushCalendarPatch({ layer: next as GanttLayerFilter })}
                  options={[
                    { value: "all", label: tLayers("all"), shortLabel: tLayers("all") },
                    { value: "cereri", label: tLayers("cereri"), shortLabel: tCommon("requestsShort") },
                    { value: "confirmate", label: tLayers("confirmate"), shortLabel: tCommon("confirmedShort") },
                    { value: "in_house", label: tLayers("in_house"), shortLabel: tCommon("inShort") },
                    { value: "trecute", label: tLayers("trecute"), shortLabel: tCommon("pastShort") },
                    { value: "hold", label: tLayers("hold"), shortLabel: tLayers("hold") },
                    { value: "block", label: tLayers("block"), shortLabel: tCommon("blocksShort") },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>

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
                <DayHeader
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
                          "gantt-building-header px-2 py-2 text-left",
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
                        <div className="gantt-building-header__inner flex items-center gap-2">
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
                            size="lg"
                            buildingHasAnyRoomAc={group.hasAnyRoomAc}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="gantt-building-header__title">
                              {group.buildingName}
                            </span>
                            <span className="gantt-building-header__count">
                              {group.rooms.length}{" "}
                              {group.rooms.length === 1 ? tCommon("room") : tCommon("rooms")}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {!collapsed &&
                      group.rooms.map((room) => (
                      <RoomRow
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
                  <RoomRow
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

        <div className="gantt-footer-legend border-t border-zinc-100 bg-zinc-50/60 px-4 py-3 text-[11px] text-zinc-600">
          <p className="gantt-stay-hint mb-2 text-xs">
            {tGantt("footer.dragHint")} · {tGantt("footer.buildingFocusHint")} ·{" "}
            <kbd className="rounded border px-1">T</kbd> {tCommon("todayShort").toLowerCase()}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="gantt-legend-swatch gantt-legend-swatch--checkout" />
              {tGantt("footer.dayDepartureUntil", { time: checkOutTime })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="gantt-legend-swatch gantt-legend-swatch--clean" />
              {tGantt("footer.cleaning")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="gantt-legend-swatch gantt-legend-swatch--checkin" />
              {tGantt("footer.nightArrivalFrom", { time: checkInTime })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="gantt-legend-swatch gantt-legend-swatch--weekend" />
              {tGantt("footer.weekend")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="gantt-legend-today-line" aria-hidden />
              {tCommon("todayShort")}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="gantt-room-today-badge gantt-room-today-badge--in">
                {tCommon("arrival")}
              </span>
              <span className="gantt-room-today-badge gantt-room-today-badge--out">
                {tCommon("departure")}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GanttBuildingMarker acMode="all_rooms" size="sm" />
              {tGantt("markers.buildingWithAc")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GanttBuildingMarker acMode="none" size="sm" />
              {tGantt("markers.buildingWithoutAc")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GanttRoomMarker acMode="all_rooms" size="sm" />
              {tCommon("room")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="mr-0.5 inline-block h-3 w-7 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[inset_2px_0_0_#059669]" />
              {tLayers("confirmate")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-7 rounded-full bg-gradient-to-r from-amber-300 to-amber-400" />
              {tCommon("request")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-7 rounded-full bg-slate-300" />
              {tLayers("trecute")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-7 rounded-full bg-yellow-300" />
              {tLayers("hold")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-7 rounded-full bg-yellow-400" />
              {tLayers("block")}
            </span>
          </div>
        </div>
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
