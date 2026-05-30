"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { resolveGanttBuildingColor } from "@/lib/building-color-palette";
import { resolveGanttAcMarkerColor } from "@/lib/gantt-ac-marker";
import { guestInitials } from "@/domain/guest-name";
import { formatGuestGanttLabel } from "@/domain/guest-name";
import { bookingBarInRange } from "@/domain/gantt/bar-position";
import { occupancyPhase } from "@/domain/occupancy/phase";
import type { OccupancySegment } from "@/domain/occupancy/types";
import type { GanttRoom } from "@/domain/gantt/types";
import type { GanttViewRange } from "@/domain/gantt/view-range";
import type { RoomTodayFlags } from "@/domain/gantt/today-activity";
import { stayTodayHighlight } from "@/domain/gantt/today-activity";
import { guestPartyTotal } from "@/lib/guest-party";
import type { BookingRow } from "@/services/bookings";
import type { PinnedSelection } from "@/domain/gantt/pinned-selection";
import type { MoveRoomDraft } from "@/components/admin/gantt/MoveRoomDialog";
import type { GanttCreateDraft } from "@/components/admin/gantt/GanttCreateDialog";
import { RoomFeatureBadges } from "@/components/admin/catalog/RoomFeatureBadges";
import { GanttRoomMarker } from "@/components/admin/gantt/GanttBuildingMarker";
import { GanttDragCreateLayer } from "@/components/admin/gantt/GanttDragCreateLayer";
import { GanttDraggableStay } from "@/components/admin/gantt/GanttDraggableStay";
import { GanttOccupancyBar } from "@/components/admin/gantt/GanttOccupancyBar";
import { DayGrid } from "./GanttGridHelpers";

export function GanttRoomRow({
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
