"use client";

import {
  Fragment,
  memo,
  useCallback,
  useMemo,
  useRef,
  type CSSProperties,
  type RefObject,
} from "react";
import { GANTT_ROW_H, GANTT_ROW_H_COMPACT } from "@/domain/gantt/layout";
import type { GanttRoom } from "@/domain/gantt/types";
import type { GanttViewRange } from "@/domain/gantt/view-range";
import type { OccupancySegment } from "@/domain/occupancy/types";
import type { RoomTodayFlags } from "@/domain/gantt/today-activity";
import type { BookingRow } from "@/services/bookings/types";
import type { PinnedSelection } from "@/domain/gantt/pinned-selection";
import type { MoveRoomDraft } from "@/features/calendar/ui/MoveRoomDialog";
import type { GanttCreateDraft } from "@/features/calendar/ui/GanttCreateDialog";
import type { GanttDayGridOptions, GanttShellZoom } from "@/features/calendar/ui/GanttGridHelpers";
import type { GanttDeparturePolicy } from "@/domain/gantt/stay-card-display";
import { GanttBuildingMarker } from "@/features/calendar/ui/GanttBuildingMarker";
import { DayGrid } from "@/features/calendar/ui/GanttGridHelpers";
import { GanttRoomRow } from "@/features/calendar/ui/GanttRoomRow";
import { resolveGanttAcMarkerColor } from "@/lib/gantt-ac-marker";
import { resolveGanttBuildingColor } from "@/lib/building-color-palette";
import { useWindowVirtualRange } from "@/hooks/useWindowVirtualRange";
import type { AcMode } from "@/types/database";

const GANTT_BUILDING_HEADER_H = 32;
const VIRTUALIZE_MIN_ITEMS = 10;
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

function GanttVirtualSpacer({ height }: { height: number }) {
  if (height <= 0) return null;
  return (
    <tr className="gantt-virtual-spacer" aria-hidden>
      <td
        colSpan={2}
        className="gantt-virtual-spacer__cell"
        style={{ height }}
      />
    </tr>
  );
}

const GanttBuildingHeaderRow = memo(function GanttBuildingHeaderRow({
  group,
  collapsed,
  focused,
  dimHeader,
  onToggleFocus,
  onToggleCollapsed,
  viewRange,
  compact,
  touch,
  checkInTime,
  checkOutTime,
  dayGridOptions,
}: {
  group: GanttBuildingGroup;
  collapsed: boolean;
  focused: boolean;
  dimHeader: boolean;
  onToggleFocus: (buildingId: string) => void;
  onToggleCollapsed: (buildingId: string) => void;
  viewRange: GanttViewRange;
  compact: boolean;
  touch: boolean;
  checkInTime: string;
  checkOutTime: string;
  dayGridOptions?: GanttDayGridOptions;
}) {
  return (
    <tr className="gantt-building-header-row">
      <td
        className={[
          "gantt-building-header sticky left-0 z-10 px-3 py-1 text-left",
          focused && "gantt-building-header--focused",
          dimHeader && "gantt-building-header--dimmed",
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          {
            "--building-spine": resolveGanttBuildingColor(
              group.buildingColor,
              group.buildingAcMode
            ),
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
        </div>
      </td>
      <td className="gantt-building-header__days relative w-full overflow-hidden p-0 align-top">
        <DayGrid
          columns={viewRange.days}
          compact={compact}
          touch={touch}
          checkInTime={checkInTime}
          checkOutTime={checkOutTime}
          dayGridOptions={dayGridOptions}
        />
      </td>
    </tr>
  );
});

type GanttBodyProps = {
  shellRef: RefObject<HTMLElement | null>;
  theadRef: RefObject<HTMLElement | null>;
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
  /** Pixel height for window virtualizer — must match --gantt-row-h for active density */
  rowHeight?: number;
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
  shellZoom?: GanttShellZoom;
  departurePolicy?: GanttDeparturePolicy;
  emptyMessage?: string;
  /** Inner .gantt-scroll scroll — window virtualizer mis-measures on compact mobile */
  disableVirtualization?: boolean;
};

function useVirtualItems({
  groupByBuilding,
  buildingGroups,
  filteredRooms,
  collapsedBuildings,
  focusBuildingId,
}: Pick<
  GanttBodyProps,
  | "groupByBuilding"
  | "buildingGroups"
  | "filteredRooms"
  | "collapsedBuildings"
  | "focusBuildingId"
>) {
  return useMemo((): VirtualItem[] => {
    if (groupByBuilding) {
      const items: VirtualItem[] = [];
      for (const group of buildingGroups) {
        items.push({ kind: "building", group });
        if (!collapsedBuildings.has(group.buildingId)) {
          const dimmed = focusBuildingId != null && focusBuildingId !== group.buildingId;
          for (const room of group.rooms) {
            items.push({ kind: "room", room, dimmed });
          }
        }
      }
      return items;
    }
    return filteredRooms.map((room) => ({ kind: "room" as const, room }));
  }, [buildingGroups, collapsedBuildings, filteredRooms, focusBuildingId, groupByBuilding]);
}

type GanttTbodyRowsProps = Omit<GanttBodyProps, "shellRef" | "theadRef"> & {
  visibleItems: VirtualItem[];
};

function GanttTbodyRows({
  visibleItems,
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
  shellZoom,
  emptyMessage,
  departurePolicy,
}: GanttTbodyRowsProps) {
  return (
    <>
      {visibleItems.map((item) => {
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
              viewRange={viewRange}
              compact={compact}
              touch={touch}
              checkInTime={checkInTime}
              checkOutTime={checkOutTime}
              dayGridOptions={dayGridOptions}
            />
          );
        }
        return (
          <Fragment key={item.room.id}>
            <GanttRoomRow
              room={item.room}
              viewRange={viewRange}
              occupancyByRoom={occupancyByRoom}
              staySegments={
                displaySegmentsByRoom.stay.get(item.room.id) ??
                EMPTY_OCCUPANCY_SEGMENTS
              }
              overlays={
                displaySegmentsByRoom.overlay.get(item.room.id) ??
                EMPTY_OCCUPANCY_SEGMENTS
              }
              checkInTime={checkInTime}
              checkOutTime={checkOutTime}
              compact={compact}
              touch={touch}
              dimmed={item.dimmed}
              todayFlags={
                todayFlagsByRoom.get(item.room.id) ?? EMPTY_ROOM_TODAY_FLAGS
              }
              onOccOpen={onOccOpen}
              bookingById={bookingById}
              onMoveRoom={onMoveRoom}
              onCreateDraft={onCreateDraft}
              pinnedSelection={pinnedSelection}
              onCtrlDragEnd={onCtrlDragEnd}
              today={today}
              dayGridOptions={dayGridOptions}
              shellZoom={shellZoom}
              departurePolicy={departurePolicy}
            />
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
    </>
  );
}

function GanttPlainBody(props: GanttBodyProps & { virtualItems: VirtualItem[] }) {
  const { virtualItems, ...rest } = props;
  return (
    <tbody>
      <GanttTbodyRows {...rest} visibleItems={virtualItems} />
    </tbody>
  );
}

function GanttWindowVirtualBody(
  props: GanttBodyProps & { virtualItems: VirtualItem[] }
) {
  const { virtualItems, shellRef, theadRef, rowHeight = GANTT_ROW_H, ...rest } =
    props;
  const virtualItemsRef = useRef(virtualItems);
  virtualItemsRef.current = virtualItems;

  const estimateSize = useCallback((index: number) => {
    const item = virtualItemsRef.current[index];
    return item?.kind === "building" ? GANTT_BUILDING_HEADER_H : rowHeight;
  }, [rowHeight]);

  const { range, paddingTop, paddingBottom } = useWindowVirtualRange({
    count: virtualItems.length,
    estimateSize,
    shellRef,
    theadRef,
    overscan: 6,
    enabled: true,
  });

  const visibleItems = virtualItems.slice(range.start, range.end);

  return (
    <tbody className="gantt-tbody--virtual">
      <GanttVirtualSpacer height={paddingTop} />
      <GanttTbodyRows {...rest} visibleItems={visibleItems} />
      <GanttVirtualSpacer height={paddingBottom} />
    </tbody>
  );
}

export function GanttVirtualizedBody(props: GanttBodyProps) {
  const virtualItems = useVirtualItems(props);

  if (
    props.disableVirtualization ||
    virtualItems.length < VIRTUALIZE_MIN_ITEMS
  ) {
    return <GanttPlainBody {...props} virtualItems={virtualItems} />;
  }

  return <GanttWindowVirtualBody {...props} virtualItems={virtualItems} />;
}
