"use client";

import {
  Fragment,
  memo,
  useMemo,
  type CSSProperties,
} from "react";
import { useTranslations } from "next-intl";
import type { GanttRoom } from "@/domain/gantt/types";
import type { GanttViewRange } from "@/domain/gantt/view-range";
import type { OccupancySegment } from "@/domain/occupancy/types";
import type { RoomTodayFlags } from "@/domain/gantt/today-activity";
import type { BookingRow } from "@/services/bookings";
import type { PinnedSelection } from "@/domain/gantt/pinned-selection";
import type { MoveRoomDraft } from "@/components/admin/gantt/MoveRoomDialog";
import type { GanttCreateDraft } from "@/components/admin/gantt/GanttCreateDialog";
import type { GanttDayGridOptions } from "@/components/admin/gantt/GanttGridHelpers";
import { GanttBuildingMarker } from "@/components/admin/gantt/GanttBuildingMarker";
import { GanttRoomRow } from "@/components/admin/gantt/GanttRoomRow";
import { resolveGanttAcMarkerColor } from "@/lib/gantt-ac-marker";
import type { AcMode } from "@/types/database";

const EMPTY_OCCUPANCY_SEGMENTS: OccupancySegment[] = [];
const EMPTY_ROOM_TODAY_FLAGS: RoomTodayFlags = {
  arrival: false,
  departure: false,
  occupiedTonight: false,
};

export type GanttBuildingGroup = {
  buildingId: string;
  buildingName: string;
  buildingColor: string | null;
  buildingAcMode: AcMode;
  hasAnyRoomAc: boolean;
  rooms: GanttRoom[];
};

type VirtualItem =
  | { kind: "building"; group: GanttBuildingGroup }
  | { kind: "room"; room: GanttRoom; dimmed?: boolean };

const GanttBuildingHeaderRow = memo(function GanttBuildingHeaderRow({
  group,
  collapsed,
  focused,
  dimHeader,
  onToggleFocus,
  onToggleCollapsed,
}: {
  group: GanttBuildingGroup;
  collapsed: boolean;
  focused: boolean;
  dimHeader: boolean;
  onToggleFocus: (buildingId: string) => void;
  onToggleCollapsed: (buildingId: string) => void;
}) {
  const tCommon = useTranslations("admin.common");

  return (
    <tr className="gantt-building-header-row border-t border-zinc-200">
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
            "--marker-color": resolveGanttAcMarkerColor(group.buildingAcMode, {
              buildingHasAnyRoomAc: group.hasAnyRoomAc,
            }),
          } as CSSProperties
        }
        onClick={() => onToggleFocus(group.buildingId)}
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
              onToggleCollapsed(group.buildingId);
            }}
          >
            ▾
          </button>
          <GanttBuildingMarker
            acMode={group.buildingAcMode}
            size="sm"
            buildingHasAnyRoomAc={group.hasAnyRoomAc}
          />
          <span className="gantt-building-header__title">{group.buildingName}</span>
          <span className="gantt-building-header__count">
            {group.rooms.length}{" "}
            {group.rooms.length === 1 ? tCommon("room") : tCommon("rooms")}
          </span>
        </div>
      </td>
    </tr>
  );
});

/**
 * Renders all Gantt room rows directly (no window virtualization).
 * Virtualization was removed — it caused React #185 infinite update loops in production.
 */
export function GanttVirtualizedBody({
  groupByBuilding,
  buildingGroups,
  filteredRooms,
  collapsedBuildings,
  focusBuildingId,
  onToggleFocusBuilding,
  onToggleCollapsedBuilding,
  viewRange,
  occupancyByRoom,
  displaySegmentsByRoom,
  checkInTime,
  checkOutTime,
  compact,
  touch,
  todayFlagsByRoom,
  onOccOpen,
  bookingById,
  onMoveRoom,
  onCreateDraft,
  pinnedSelection,
  onCtrlDragEnd,
  today,
  dayGridOptions,
  emptyMessage,
}: {
  groupByBuilding: boolean;
  buildingGroups: GanttBuildingGroup[];
  filteredRooms: GanttRoom[];
  collapsedBuildings: Set<string>;
  focusBuildingId: string | null;
  onToggleFocusBuilding: (buildingId: string) => void;
  onToggleCollapsedBuilding: (buildingId: string) => void;
  viewRange: GanttViewRange;
  occupancyByRoom: Map<string, OccupancySegment[]>;
  displaySegmentsByRoom: {
    stay: Map<string, OccupancySegment[]>;
    overlay: Map<string, OccupancySegment[]>;
  };
  checkInTime: string;
  checkOutTime: string;
  compact: boolean;
  touch: boolean;
  todayFlagsByRoom: Map<string, RoomTodayFlags>;
  onOccOpen: (seg: OccupancySegment, roomName: string) => void;
  bookingById: Map<string, BookingRow>;
  onMoveRoom: (draft: MoveRoomDraft) => void;
  onCreateDraft: (draft: GanttCreateDraft) => void;
  pinnedSelection?: PinnedSelection | null;
  onCtrlDragEnd?: (roomIds: string[], checkIn: string, checkOut: string) => void;
  today: string;
  dayGridOptions?: GanttDayGridOptions;
  emptyMessage?: string;
}) {
  const virtualItems = useMemo((): VirtualItem[] => {
    if (groupByBuilding) {
      const items: VirtualItem[] = [];
      for (const group of buildingGroups) {
        items.push({ kind: "building", group });
        if (!collapsedBuildings.has(group.buildingId)) {
          const dimmed = focusBuildingId != null && focusBuildingId !== group.buildingId;
          for (const room of group.rooms) {
            items.push({
              kind: "room",
              room,
              dimmed,
            });
          }
        }
      }
      return items;
    }
    return filteredRooms.map((room) => ({ kind: "room" as const, room }));
  }, [
    buildingGroups,
    collapsedBuildings,
    filteredRooms,
    focusBuildingId,
    groupByBuilding,
  ]);

  const renderRoomRow = (room: GanttRoom, dimmed?: boolean) => (
    <GanttRoomRow
      key={room.id}
      room={room}
      viewRange={viewRange}
      occupancyByRoom={occupancyByRoom}
      staySegments={
        displaySegmentsByRoom.stay.get(room.id) ?? EMPTY_OCCUPANCY_SEGMENTS
      }
      overlays={
        displaySegmentsByRoom.overlay.get(room.id) ?? EMPTY_OCCUPANCY_SEGMENTS
      }
      checkInTime={checkInTime}
      checkOutTime={checkOutTime}
      compact={compact}
      touch={touch}
      dimmed={dimmed}
      todayFlags={todayFlagsByRoom.get(room.id) ?? EMPTY_ROOM_TODAY_FLAGS}
      onOccOpen={onOccOpen}
      bookingById={bookingById}
      onMoveRoom={onMoveRoom}
      onCreateDraft={onCreateDraft}
      pinnedSelection={pinnedSelection}
      onCtrlDragEnd={onCtrlDragEnd}
      today={today}
      dayGridOptions={dayGridOptions}
    />
  );

  return (
    <tbody>
      {virtualItems.map((item) => {
        if (item.kind === "building") {
          const collapsed = collapsedBuildings.has(item.group.buildingId);
          const focused = focusBuildingId === item.group.buildingId;
          const dimHeader = focusBuildingId != null && !focused;
          return (
            <GanttBuildingHeaderRow
              key={`building-${item.group.buildingId}`}
              group={item.group}
              collapsed={collapsed}
              focused={focused}
              dimHeader={dimHeader}
              onToggleFocus={onToggleFocusBuilding}
              onToggleCollapsed={onToggleCollapsedBuilding}
            />
          );
        }
        return (
          <Fragment key={item.room.id}>
            {renderRoomRow(item.room, item.dimmed)}
          </Fragment>
        );
      })}
      {filteredRooms.length === 0 && emptyMessage && (
        <tr>
          <td colSpan={2} className="px-4 py-12 text-center text-sm text-zinc-500">
            {emptyMessage}
          </td>
        </tr>
      )}
    </tbody>
  );
}
