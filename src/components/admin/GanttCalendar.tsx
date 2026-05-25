"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { buildCalendarQuery } from "@/lib/gantt-query";
import { formatDateWithDay } from "@/lib/ro-calendar";
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
import { GanttTodayPanel } from "@/components/admin/gantt/GanttTodayPanel";
import { GanttRadialController } from "@/components/admin/gantt/GanttRadialController";
import { GanttToolbarOccForm } from "@/components/admin/gantt/GanttToolbarOccForm";
import { AdminPortal } from "@/components/admin/overlay/AdminPortal";
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

export type { GanttRoom };

const ROOM_COL_W = "11rem";

const GANTT_DAY_CELL =
  "gantt-day-cell min-w-0 bg-white shadow-[inset_0_0_0_1px_#d4d4d8]";

type InlineZoomChoice = "today" | "days7" | "days15" | "days30" | "quarter";

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
    "gantt-day-header-cell min-w-0 shadow-[inset_0_0_0_1px_#d4d4d8]",
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
}: {
  columns: GanttViewRange["days"];
  compact: boolean;
}) {
  return (
    <div
      className="gantt-day-header-grid grid w-full min-w-0 border-b border-zinc-300 bg-gradient-to-b from-slate-50 to-zinc-100/90"
      style={ganttDayGridStyle(columns.length)}
      data-gantt-day-grid=""
      data-gantt-day-count={columns.length}
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
            Azi
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
              {compact ? col.weekday.slice(0, 2) : col.weekday}
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
}: {
  counts: DailyFreeCount[];
  viewRange: GanttViewRange;
  compact: boolean;
  activeFocusIso: string | null;
  filterActive: boolean;
  onDayClick: (iso: string) => void;
}) {
  return (
    <div
      className="gantt-summary-row__grid grid w-full min-w-0"
      style={ganttDayGridStyle(viewRange.days.length)}
      role="row"
      aria-label="Camere libere pe zi"
    >
      {viewRange.days.map((col, i) => {
        const { free, total } = counts[i]!;
        const heat = dailyFreeHeatLevel(free, total);
        const isSelected = filterActive && activeFocusIso === col.iso;
        const title =
          total === 0
            ? col.iso
            : `${free} camere libere · click pentru filtru`;

        return (
          <button
            key={col.iso}
            type="button"
            title={title}
            aria-pressed={isSelected}
            aria-label={`${col.iso}: ${free} camere libere`}
            onClick={() => onDayClick(col.iso)}
            className={[
              "gantt-summary-cell min-w-0 border-r border-zinc-100/80 transition",
              compact ? "gantt-summary-cell--compact py-1" : "py-1.5",
              col.isWeekend && "gantt-summary-cell--weekend",
              col.isToday && "gantt-summary-cell--today",
              `gantt-summary-cell--${heat}`,
              isSelected && "gantt-summary-cell--selected",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="gantt-summary-cell__value tabular-nums">{free}</span>
            {!compact && total > 0 && (
              <span className="gantt-summary-cell__total">camere</span>
            )}
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
}) {
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
            className="gantt-head-main-row__room gantt-room-column-header gantt-viewport-header__room"
            style={{ width: state.roomColumnWidth }}
          >
            Cameră
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
                <DayHeader columns={viewRange.days} compact={compact} />
              </div>
            </div>
          </div>
        </div>

        <div className="gantt-viewport-header__row gantt-viewport-header__row--summary">
          <div
            className="gantt-summary-row__label gantt-viewport-header__summary-label"
            style={{ width: state.roomColumnWidth }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              Libere
            </span>
            {filterActive && activeFocusIso && (
              <span className="mt-0.5 block text-[9px] font-medium text-emerald-700">
                filtru activ
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
}) {
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
        className="gantt-room-cell sticky left-0 z-10 border-r border-zinc-200 bg-white px-3 py-2 align-top"
        style={{ "--marker-color": sidebarMarkerColor } as CSSProperties}
      >
        <div className="flex items-start gap-2.5">
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
                ? seg.reason?.trim() || "Hold"
                : seg.reason?.trim() || "Blocat";
            const title =
              seg.kind === "hold"
                ? `Hold: ${label} · ${seg.checkIn} → ${seg.checkOut}`
                : `Blocare: ${label} · ${seg.checkIn} → ${seg.checkOut}`;
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
            const todayHl = stayTodayHighlight(b);
            const initials = guestInitials(
              b.guest_last_name,
              b.guest_first_name,
              b.guest_name
            );
            const phase = seg.phase ?? occupancyPhase(seg.checkIn, seg.checkOut);
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
                popover={{
                  bookingId: b.id,
                  guestName: b.guest_name,
                  label: ganttLabel,
                  checkIn: seg.checkIn,
                  checkOut: seg.checkOut,
                  status: b.status as "cerere_noua" | "confirmata",
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
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const touch = useIsTouchDevice();
  const compact = viewRange.zoom === "quarter" || touch;
  const dayIsos = useMemo(() => viewRange.days.map((d) => d.iso), [viewRange.days]);
  const defaultFocusIso = focusDayInRange(dayIsos);
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
    for (const segment of filterOccupancyForLayer(occupancy, layerFilter)) {
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
  const todayLinePct =
    todayIndex >= 0 ? ((todayIndex + 0.5) / dayCount) * 100 : null;

  const todaySummary = useMemo(
    () => summarizeGanttToday(activeBookings, dayIsos),
    [activeBookings, dayIsos]
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

  const scrollToTodayColumn = useCallback(() => {
    const el = scrollRef.current;
    if (!el || todayIndex < 0 || dayCount === 0) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;
    const ratio = (todayIndex + 0.5) / dayCount;
    const target = ratio * maxScroll - el.clientWidth * 0.28;
    el.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [todayIndex, dayCount]);

  useEffect(() => {
    if (todayIndex < 0 || scrolledPeriodRef.current === viewRange.periodKey) {
      return;
    }
    scrolledPeriodRef.current = viewRange.periodKey;
    const t = window.setTimeout(scrollToTodayColumn, 120);
    return () => window.clearTimeout(t);
  }, [viewRange.periodKey, todayIndex, scrollToTodayColumn]);

  const [focusBuildingId, setFocusBuildingId] = useState<string | null>(null);
  const [occDetail, setOccDetail] = useState<GanttOccDetail | null>(null);
  const [occFormMode, setOccFormMode] = useState<
    "hold" | "block" | "cerere" | "direct" | "move" | null
  >(null);
  const [moveRoomDraft, setMoveRoomDraft] = useState<MoveRoomDraft | null>(null);
  const [createDraft, setCreateDraft] = useState<GanttCreateDraftRequest | null>(
    null
  );
  const [collapsedBuildings, setCollapsedBuildings] = useState<Set<string>>(
    () => new Set()
  );

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
        buildingName: buildingRooms[0]?.building_name ?? "Clădire",
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

  const handleSummaryDayClick = useCallback(
    (iso: string) => {
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
  const firstIso = viewRange.days[0]?.iso ?? todayIso();
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
  const inlineViewChoice = searchParams.get("view") === "room" ? "room" : "all";
  const selectedRoomId = searchParams.get("room") ?? "";
  const selectedFeature = featureFilter;

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
        view: patch.view ?? inlineViewChoice,
        room:
          patch.room !== undefined
            ? patch.room ?? undefined
            : selectedRoomId || undefined,
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
      inlineViewChoice,
      layerFilter,
      router,
      selectedFeature,
      selectedRoomId,
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
      pushCalendarPatch({
        zoom: nextZoom,
        ws: nextZoom === "quarter" || nextZoom === "days30" ? null : todayIso(),
        q: nextZoom === "quarter" ? currentQuarter : undefined,
      });
    },
    [currentMonth, pushCalendarPatch, viewRange.periodKey, viewRange.zoom]
  );

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

  const gridBodyTop = "var(--gantt-body-top, 5.75rem)";

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
            <div className="gantt-inline-controls__primary-section gantt-inline-controls__primary-section--period">
              <div className="gantt-inline-controls__period-stack">
                <div className="gantt-inline-controls__period-main">
                  <SegmentGroup
                    label="Interval"
                    compact
                    value={zoomChoice}
                    onChange={(next) => handleInlineZoomChange(next as InlineZoomChoice)}
                    options={[
                      { value: "today", label: "Azi", shortLabel: "Azi" },
                      { value: "days7", label: "7 zile", shortLabel: "7z" },
                      { value: "days15", label: "15 zile", shortLabel: "15z" },
                      { value: "days30", label: "30 zile", shortLabel: "30z" },
                      { value: "quarter", label: "Trimestru", shortLabel: "Trim." },
                    ]}
                  />

                  <div className="gantt-toolbar__period-shell">
                    <div className="gantt-toolbar__period">
                      <button
                        type="button"
                        className="gantt-toolbar__nav"
                        aria-label="Perioada anterioară"
                        onClick={() => navigatePeriod(-1)}
                      >
                        ←
                      </button>
                      <span className="gantt-toolbar__title capitalize">{viewRange.title}</span>
                      <button
                        type="button"
                        className="gantt-toolbar__nav"
                        aria-label="Perioada următoare"
                        onClick={() => navigatePeriod(1)}
                      >
                        →
                      </button>
                    </div>
                  </div>
                </div>

                <div className="gantt-inline-controls__period-nav">
                  <GanttTodayPanel
                    summary={todaySummary}
                    checkInTime={checkInTime}
                    checkOutTime={checkOutTime}
                    onScrollToToday={scrollToTodayColumn}
                    compact
                  />

                  <div className="gantt-toolbar__shifters" aria-label="Deplasare grid">
                    <div className="gantt-toolbar__stepper">
                      <span className="gantt-toolbar__stepper-label">1 zi</span>
                      <div className="gantt-toolbar__stepper-actions">
                        <button
                          type="button"
                          className="gantt-toolbar__mini-nav"
                          aria-label="Înapoi o zi"
                          onClick={() => shiftGrid(-1)}
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          className="gantt-toolbar__mini-nav"
                          aria-label="Înainte o zi"
                          onClick={() => shiftGrid(1)}
                        >
                          →
                        </button>
                      </div>
                    </div>

                    <div className="gantt-toolbar__stepper">
                      <span className="gantt-toolbar__stepper-label">1 săpt.</span>
                      <div className="gantt-toolbar__stepper-actions">
                        <button
                          type="button"
                          className="gantt-toolbar__mini-nav"
                          aria-label="Înapoi o săptămână"
                          onClick={() => shiftGrid(-7)}
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          className="gantt-toolbar__mini-nav"
                          aria-label="Înainte o săptămână"
                          onClick={() => shiftGrid(7)}
                        >
                          →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="gantt-inline-controls__center">
              <GanttRadialController
                onOpenRequest={() => setOccFormMode("cerere")}
                onOpenHold={() => setOccFormMode("hold")}
                onOpenMove={() => setOccFormMode("move")}
                onOpenBlock={() => setOccFormMode("block")}
                onOpenReception={() => setOccFormMode("direct")}
              />
            </div>

            <div className="gantt-inline-controls__primary-section gantt-inline-controls__primary-section--rooms">
              <SegmentGroup
                label="Camere"
                compact
                value={filter}
                onChange={(next) =>
                  pushCalendarPatch({
                    filter: next as GanttFilter,
                    fd: next === "free" ? focusDay || null : null,
                  })
                }
                options={[
                  { value: "all", label: "Toate" },
                  { value: "occupied", label: "Ocupate" },
                  { value: "free", label: "Libere" },
                ]}
              />

              <div className="gantt-inline-controls__room-picker-shell">
                <span className="gantt-inline-controls__picker-label">Camera</span>
                <div className="gantt-inline-controls__room-picker">
                  {inlineViewChoice === "room" && rooms.length > 0 ? (
                    <select
                      value={selectedRoomId || rooms[0]?.id || ""}
                      onChange={(e) =>
                        pushCalendarPatch({ view: "room", room: e.target.value })
                      }
                      className="gantt-toolbar__select gantt-toolbar__select--wide"
                      aria-label="Cameră"
                    >
                      <option value="">Selectează camera…</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name} · {room.building_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="gantt-inline-controls__all-rooms">Toate camerele</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="gantt-inline-controls__row gantt-inline-controls__row--secondary">
            <SegmentGroup
              label="Strat"
              compact
              value={layerFilter}
              onChange={(next) => pushCalendarPatch({ layer: next as GanttLayerFilter })}
              options={[
                { value: "all", label: "Tot", shortLabel: "Tot" },
                { value: "cereri", label: "Cereri", shortLabel: "Cer." },
                { value: "confirmate", label: "Confirmate", shortLabel: "Conf." },
                { value: "in_house", label: "In-house", shortLabel: "In" },
                { value: "trecute", label: "Trecute", shortLabel: "Trec." },
                { value: "hold", label: "Hold", shortLabel: "Hold" },
                { value: "block", label: "Blocări", shortLabel: "Bloc" },
              ]}
            />

            <SegmentGroup
              label="Opțiuni"
              compact
              value={selectedFeature}
              onChange={(next) =>
                pushCalendarPatch({ feat: next as GanttFeatureFilter })
              }
              options={[
                { value: "all", label: "Toate" },
                { value: "ac", label: "Cu AC" },
                { value: "fridge", label: "Frigider" },
              ]}
            />

            <SegmentGroup
              label="Vizualizare"
              compact
              value={inlineViewChoice}
              onChange={(next) =>
                pushCalendarPatch({
                  view: next as "all" | "room",
                  room:
                    next === "room"
                      ? selectedRoomId || rooms[0]?.id || null
                      : null,
                })
              }
              options={[
                { value: "all", label: "Toate camerele", shortLabel: "Toate" },
                { value: "room", label: "Alege cameră", shortLabel: "Cameră" },
              ]}
            />
          </div>
        </div>

        {filter === "free" && focusDay && (
          <div className="gantt-summary-filter-banner mx-3 mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-xs text-emerald-900">
            <span>
              Afișezi camere <strong>libere</strong> pe{" "}
              <strong>{formatDateWithDay(focusDay, true)}</strong>
            </span>
            <button
              type="button"
              className="rounded-md border border-emerald-300 bg-white px-2.5 py-1 font-semibold hover:bg-emerald-100"
              onClick={() => handleSummaryDayClick(focusDay)}
            >
              Resetează filtru
            </button>
          </div>
        )}

        {todayLinePct != null && (
          <div
            className="gantt-today-line pointer-events-none absolute bottom-0 z-[5]"
            style={{
              top: gridBodyTop,
              left: `calc(${ROOM_COL_W} + (100% - ${ROOM_COL_W}) * ${todayLinePct / 100})`,
            }}
            aria-hidden
          />
        )}

        <table
          className={[
            "w-full table-fixed border-separate border-spacing-0 text-xs",
            compact ? "min-w-[2400px]" : "min-w-full",
          ].join(" ")}
        >
          <colgroup>
            <col style={{ width: ROOM_COL_W }} />
            <col />
          </colgroup>
          <thead ref={theadRef} className="gantt-thead-sticky">
            <tr className="gantt-head-main-row bg-gradient-to-r from-slate-50 to-zinc-50">
              <th className="gantt-head-main-row__room gantt-room-column-header sticky left-0 z-30 border-r border-zinc-200 px-3 py-3 text-left text-xs font-semibold tracking-wide text-zinc-700">
                Cameră
              </th>
              <th className="gantt-head-main-row__days p-0">
                <DayHeader columns={viewRange.days} compact={compact} />
              </th>
            </tr>
            <GanttDailySummaryRow
              counts={dailyFreeCounts}
              viewRange={viewRange}
              compact={compact}
              activeFocusIso={focusDay}
              filterActive={filter === "free" && !!focusDay}
              onDayClick={handleSummaryDayClick}
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
                          "gantt-building-header px-3 py-2.5 text-left",
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
                        <div className="gantt-building-header__inner flex items-center gap-3">
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
                              {group.rooms.length === 1 ? "cameră" : "camere"}
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
                        onCreateDraft={setCreateDraft}
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
                    onCreateDraft={setCreateDraft}
                  />
                ))}
            {filteredRooms.length === 0 && (
              <tr>
                <td
                  colSpan={2}
                  className="px-4 py-12 text-center text-sm text-zinc-500"
                >
                  {filter !== "all"
                    ? "Nicio cameră pentru filtrul ales — încearcă „Toate”."
                    : "Nicio cameră pentru filtrul ales."}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="gantt-footer-legend border-t border-zinc-100 bg-zinc-50/60 px-4 py-3 text-[11px] text-zinc-600">
          <p className="gantt-stay-hint mb-2 text-xs">
            Trage ±1 zi · click/dublu-click pe bară ·
            focus clădire din chips · <kbd className="rounded border px-1">T</kbd>{" "}
            azi
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="gantt-legend-swatch gantt-legend-swatch--checkout" />
              Zi — plecare (până {checkOutTime})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="gantt-legend-swatch gantt-legend-swatch--clean" />
              Curățenie
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="gantt-legend-swatch gantt-legend-swatch--checkin" />
              Noapte — sosire (de la {checkInTime})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="gantt-legend-swatch gantt-legend-swatch--weekend" />
              Weekend
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="gantt-legend-today-line" aria-hidden />
              Azi
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="gantt-room-today-badge gantt-room-today-badge--in">
                Sosire
              </span>
              <span className="gantt-room-today-badge gantt-room-today-badge--out">
                Plecare
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GanttBuildingMarker acMode="all_rooms" size="sm" />
              Clădire cu AC
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GanttBuildingMarker acMode="none" size="sm" />
              Clădire fără AC
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GanttRoomMarker acMode="all_rooms" size="sm" />
              Cameră
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="mr-0.5 inline-block h-3 w-7 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[inset_2px_0_0_#059669]" />
              Confirmată
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-7 rounded-full bg-gradient-to-r from-amber-300 to-amber-400" />
              Cerere
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-7 rounded-full bg-slate-300" />
              Trecut
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-7 rounded-full bg-yellow-300" />
              Hold
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-7 rounded-full bg-yellow-400" />
              Blocare
            </span>
          </div>
        </div>
      </div>
    </div>
      <GanttContextMenuPanel />
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
      />
    </GanttContextMenuProvider>
  );
}
