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
import { useTranslations } from "next-intl";
import { GANTT_ROW_H } from "@/domain/gantt/layout";
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
import { useWindowVirtualRange } from "@/hooks/useWindowVirtualRange";
import type { AcMode } from "@/types/database";

const GANTT_BUILDING_HEADER_H = 32;
const VIRTUALIZE_MIN_ITEMS = 16;
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
  emptyMessage,
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
  const { virtualItems, shellRef, theadRef, ...rest } = props;
  const virtualItemsRef = useRef(virtualItems);
  virtualItemsRef.current = virtualItems;

  const estimateSize = useCallback((index: number) => {
    const item = virtualItemsRef.current[index];
    return item?.kind === "building" ? GANTT_BUILDING_HEADER_H : GANTT_ROW_H;
  }, []);

  const { range, paddingTop, paddingBottom } = useWindowVirtualRange({
    count: virtualItems.length,
    estimateSize,
    shellRef,
    theadRef,
    overscan: 5,
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
