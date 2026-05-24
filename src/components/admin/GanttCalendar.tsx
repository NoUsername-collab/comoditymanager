"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { guestInitials } from "@/domain/guest-name";
import { resolveGanttBuildingColor } from "@/lib/building-color-palette";
import { useIsTouchDevice } from "@/hooks/useDeviceClass";
import type { BookingRow } from "@/services/bookings";
import { formatGuestGanttLabel } from "@/domain/guest-name";
import { bookingBarInRange } from "@/domain/gantt/bar-position";
import {
  bookingMatchesLayerFilter,
  roomOverlaySegments,
  roomStaySegments,
  type GanttLayerFilter,
} from "@/domain/gantt/occupancy-layer";
import { occupancyPhase } from "@/domain/occupancy/phase";
import type { OccupancySegment } from "@/domain/occupancy/types";
import { ganttDayTimeStyle } from "@/lib/gantt-time";
import type { GanttFilter } from "@/domain/gantt/filters";
import { filterGanttRooms, focusDayInRange } from "@/domain/gantt/filters";
import type { GanttRoom } from "@/domain/gantt/types";
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
import type { GanttCreateDraftRequest } from "@/domain/gantt/context-menu";
import {
  GanttBuildingMarker,
  GanttRoomMarker,
} from "@/components/admin/gantt/GanttBuildingMarker";
import { resolveGanttAcMarkerColor } from "@/lib/gantt-ac-marker";
import { GanttTodayPanel } from "@/components/admin/gantt/GanttTodayPanel";
import { GanttZoneRibbon } from "@/components/admin/gantt/GanttZoneRibbon";
import {
  GanttBuildingChips,
  type GanttBuildingChip,
} from "@/components/admin/gantt/GanttBuildingChips";
import { GanttUnassignedRow } from "@/components/admin/gantt/GanttUnassignedRow";
import {
  roomTodayFlags,
  stayTodayHighlight,
  summarizeGanttToday,
} from "@/domain/gantt/today-activity";

export type { GanttRoom };

const ROOM_COL_W = "11rem";
const ROW_H = 56;

function bookingInViewRange(
  b: BookingRow,
  rangeStart: string,
  rangeEnd: string
): boolean {
  if (b.status === "anulata") return false;
  return b.check_in <= rangeEnd && b.check_out >= rangeStart;
}

const GANTT_DAY_CELL =
  "gantt-day-cell min-w-0 bg-white shadow-[inset_0_0_0_1px_#d4d4d8]";

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
              "flex flex-1 flex-col items-center justify-center py-1.5 text-center leading-tight",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {compact ? (
              <span className="gantt-day-header-cell__label text-[8px] font-semibold">
                {col.weekday.slice(0, 2)} {col.dayNum}
              </span>
            ) : (
              <span className="gantt-day-header-cell__label whitespace-nowrap leading-none">
                <span className="text-[10px] font-semibold">{col.weekday}</span>{" "}
                <span className="text-[12px] font-bold tabular-nums">
                  {col.dayNum}
                </span>
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function RoomRow({
  room,
  viewRange,
  bookings,
  occupancy,
  layerFilter,
  checkInTime,
  checkOutTime,
  compact,
  touch,
  dimmed,
  onOccOpen,
  bookingById,
  onMoveRoom,
  onCreateDraft,
}: {
  room: GanttRoom;
  viewRange: GanttViewRange;
  bookings: BookingRow[];
  occupancy: OccupancySegment[];
  layerFilter: GanttLayerFilter;
  checkInTime: string;
  checkOutTime: string;
  compact: boolean;
  touch: boolean;
  dimmed?: boolean;
  onOccOpen: (seg: OccupancySegment, roomName: string) => void;
  bookingById: Map<string, BookingRow>;
  onMoveRoom: (draft: MoveRoomDraft) => void;
  onCreateDraft: (draft: GanttCreateDraft) => void;
}) {
  const dayCount = viewRange.days.length;
  const staySegments = roomStaySegments(occupancy, room.id, layerFilter);
  const overlays = roomOverlaySegments(occupancy, room.id, layerFilter);

  const roomColor = resolveGanttBuildingColor(
    room.building_color,
    room.building_ac_mode
  );
  const sidebarMarkerColor = resolveGanttAcMarkerColor(room.building_ac_mode, {
    roomHasAc: room.has_ac,
  });

  const todayFlags = roomTodayFlags(room.id, bookings);

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
      <td className="relative w-full p-0 align-top">
        <GanttDragCreateLayer
          roomId={room.id}
          roomName={room.name}
          viewRange={viewRange}
          occupancy={occupancy}
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
                dayCount={dayCount}
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
  layerFilter = "all",
}: {
  viewRange: GanttViewRange;
  rooms: GanttRoom[];
  bookings: BookingRow[];
  occupancy?: OccupancySegment[];
  groupByBuilding?: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  filter?: GanttFilter;
  layerFilter?: GanttLayerFilter;
}) {
  const touch = useIsTouchDevice();
  const compact = viewRange.zoom === "quarter" || touch;
  const focusIso = focusDayInRange(viewRange.days.map((d) => d.iso));
  const filteredRooms = useMemo(
    () => filterGanttRooms(rooms, bookings, filter, focusIso, occupancy),
    [rooms, bookings, filter, focusIso, occupancy]
  );

  const todayIndex = viewRange.days.findIndex((d) => d.isToday);
  const dayCount = viewRange.days.length;
  const todayLinePct =
    todayIndex >= 0 ? ((todayIndex + 0.5) / dayCount) * 100 : null;

  const todaySummary = useMemo(
    () => summarizeGanttToday(bookings, viewRange.days.map((d) => d.iso)),
    [bookings, viewRange.days]
  );

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

  const buildingChips: GanttBuildingChip[] = useMemo(
    () =>
      buildingGroups.map((g) => ({
        id: g.buildingId,
        name: g.buildingName,
        color_hex: g.buildingColor,
        ac_mode: g.buildingAcMode,
        roomCount: g.rooms.length,
        hasAnyRoomAc: g.hasAnyRoomAc,
      })),
    [buildingGroups]
  );

  const unassignedInRange = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.room_ids.length === 0 &&
          bookingInViewRange(b, viewRange.rangeStart, viewRange.rangeEnd)
      ),
    [bookings, viewRange.rangeStart, viewRange.rangeEnd]
  );

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
    buildingChips.length,
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

  const gridBodyTop = "var(--gantt-body-top, 5.75rem)";

  return (
    <GanttContextMenuProvider
      onRequestCreate={setCreateDraft}
      onOpenMoveRoom={setMoveRoomDraft}
      onOpenOccDetail={setOccDetail}
    >
    <div
      key={viewRange.periodKey}
      ref={scrollRef}
      className="gantt-period-enter gantt-scroll w-full overflow-x-auto"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        ref={shellRef}
        className="gantt-shell gantt-shell--premium relative min-w-full overflow-hidden"
      >
        <GanttTodayPanel
          summary={todaySummary}
          checkInTime={checkInTime}
          checkOutTime={checkOutTime}
          onScrollToToday={scrollToTodayColumn}
        />

        <GanttZoneRibbon
          checkInTime={checkInTime}
          checkOutTime={checkOutTime}
        />

        {groupByBuilding && buildingChips.length > 0 && (
          <div className="mx-3 mb-2 flex flex-wrap items-center justify-between gap-2">
            <GanttBuildingChips
              buildings={buildingChips}
              focusBuildingId={focusBuildingId}
              onFocusBuilding={setFocusBuildingId}
            />
            <p className="gantt-kbd-hint hidden sm:block">
              <kbd>T</kbd> centrare azi · <kbd>Esc</kbd> reset focus
            </p>
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
            "w-full table-fixed border-collapse text-xs",
            compact ? "min-w-[2400px]" : "min-w-full",
          ].join(" ")}
        >
          <colgroup>
            <col style={{ width: ROOM_COL_W }} />
            <col />
          </colgroup>
          <thead ref={theadRef} className="gantt-thead-sticky">
            <tr className="bg-gradient-to-r from-slate-50 to-zinc-50">
              <th className="gantt-room-column-header sticky left-0 z-30 border-r border-zinc-200 px-3 py-3 text-left text-xs font-semibold tracking-wide text-zinc-700">
                Cameră
              </th>
              <th className="sticky top-0 z-20 bg-gradient-to-b from-slate-50 to-zinc-100/90 p-0">
                <DayHeader columns={viewRange.days} compact={compact} />
              </th>
            </tr>
          </thead>
          <tbody>
            <GanttUnassignedRow
              bookings={unassignedInRange}
              viewRange={viewRange}
              checkInTime={checkInTime}
              checkOutTime={checkOutTime}
              compact={compact}
              touch={touch}
            />
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
                        bookings={bookings}
                        occupancy={occupancy}
                        layerFilter={layerFilter}
                        checkInTime={checkInTime}
                        checkOutTime={checkOutTime}
                        compact={compact}
                        touch={touch}
                        dimmed={
                          focusBuildingId != null &&
                          room.building_id !== focusBuildingId
                        }
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
                    bookings={bookings}
                    occupancy={occupancy}
                    layerFilter={layerFilter}
                    checkInTime={checkInTime}
                    checkOutTime={checkOutTime}
                    compact={compact}
                    touch={touch}
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
          </div>
        </div>
      </div>
    </div>
      <GanttContextMenuPanel />
      <GanttCreateDialog
        draft={createDraft}
        onClose={() => setCreateDraft(null)}
      />
      <GanttOccupancyDetailPanel
        detail={occDetail}
        onClose={() => setOccDetail(null)}
      />
      <MoveRoomDialog
        draft={moveRoomDraft}
        rooms={rooms.map((r) => ({
          id: r.id,
          name: r.name,
          building_name: r.building_name,
        }))}
        onClose={() => setMoveRoomDraft(null)}
      />
    </GanttContextMenuProvider>
  );
}
