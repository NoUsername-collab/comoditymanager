"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAdminPendingOptional } from "@/components/admin/feedback/AdminPendingProvider";
import { useGanttContextMenu } from "@/components/admin/gantt/GanttContextMenuContext";
import type { GanttCreateDraft } from "@/components/admin/gantt/GanttCreateDialog";
import {
  LONG_PRESS_MS,
  LONG_PRESS_MOVE_PX,
} from "@/domain/gantt/context-menu";
import {
  clearGanttRoomDragSpan,
  findGanttRoomAtPoint,
  listGanttRoomIdsInDomOrder,
  setGanttRoomDragSpan,
} from "@/domain/gantt/room-at-point";
import {
  dayIndexFromPointerX,
  ghostBarPosition,
  intervalFromDayIndices,
} from "@/domain/gantt/drag-create";
import { findOccupancyConflicts } from "@/domain/occupancy/conflict";
import type { OccupancySegment } from "@/domain/occupancy/types";
import type { GanttViewRange } from "@/domain/gantt/view-range";
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
} from "@/lib/constants";
import { formatStayPeriod } from "@/lib/ro-calendar";

const BLOCK_INTERACTION_SELECTOR = "[data-gantt-block-interaction]";

type Props = {
  roomId: string;
  roomName: string;
  viewRange: GanttViewRange;
  occupancyByRoom: Map<string, OccupancySegment[]>;
  checkInTime?: string;
  checkOutTime?: string;
  touch: boolean;
  renderGrid: ReactNode;
  children: ReactNode;
  onCreateDraft: (draft: GanttCreateDraft) => void;
};

type DragState = {
  startIdx: number;
  endIdx: number;
  hasConflict: boolean;
  roomCount: number;
};

function blocksDragCreate(target: EventTarget | null): boolean {
  return (
    target instanceof Element && !!target.closest(BLOCK_INTERACTION_SELECTOR)
  );
}

function nightCountFromIndices(startIdx: number, endIdx: number): number {
  return Math.max(1, endIdx - startIdx + 1);
}

function roomIdsBetween(
  orderedRoomIds: string[],
  startRoomId: string,
  endRoomId: string
): string[] {
  const startIndex = orderedRoomIds.indexOf(startRoomId);
  const endIndex = orderedRoomIds.indexOf(endRoomId);
  if (startIndex === -1 || endIndex === -1) return [startRoomId];

  const from = Math.min(startIndex, endIndex);
  const to = Math.max(startIndex, endIndex);
  return orderedRoomIds.slice(from, to + 1);
}

export function GanttDragCreateLayer({
  roomId,
  roomName,
  viewRange,
  occupancyByRoom,
  checkInTime = DEFAULT_CHECK_IN_TIME,
  checkOutTime = DEFAULT_CHECK_OUT_TIME,
  touch,
  renderGrid,
  children,
  onCreateDraft,
}: Props) {
  const { openMenu } = useGanttContextMenu();
  const pendingCtx = useAdminPendingOptional();
  const rowRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startIdx: number;
    endIdx: number;
    startRoomId: string;
    currentRoomId: string;
    selectedRoomIds: string[];
    orderedRoomIds: string[];
  } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null);
  const armedStartIdxRef = useRef<number | null>(null);
  const longPressOpenedRef = useRef(false);
  const [drag, setDrag] = useState<DragState | null>(null);

  const dayIsos = viewRange.days.map((d) => d.iso);
  const dayCount = dayIsos.length;

  const evalConflictForRooms = useCallback(
    (checkIn: string, checkOut: string, roomIds: string[]) => {
      for (const rid of roomIds) {
        const occ = occupancyByRoom.get(rid) ?? [];
        const conflicts = findOccupancyConflicts(
          [rid],
          checkIn,
          checkOut,
          occ,
          undefined,
          { checkIn: checkInTime, checkOut: checkOutTime }
        );
        if (conflicts.length > 0) return true;
      }
      return false;
    },
    [occupancyByRoom, checkInTime, checkOutTime]
  );

  const evalConflict = useCallback(
    (checkIn: string, checkOut: string) =>
      evalConflictForRooms(checkIn, checkOut, [roomId]),
    [roomId, evalConflictForRooms]
  );

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const openEmptyMenu = useCallback(
    (clientX: number, clientY: number, dayIdx: number) => {
      const interval = intervalFromDayIndices(dayIsos, dayIdx, dayIdx);
      if (!interval) return;
      openMenu({
        kind: "create",
        clientX,
        clientY,
        roomId,
        roomName,
        checkIn: interval.checkIn,
        checkOut: interval.checkOut,
        hasConflict: evalConflict(interval.checkIn, interval.checkOut),
      });
    },
    [dayIsos, roomId, roomName, evalConflict, openMenu]
  );

  const dayIdxAt = useCallback(
    (clientX: number) => {
      const row = rowRef.current;
      if (!row || dayCount === 0) return 0;
      const rect = row.getBoundingClientRect();
      return dayIndexFromPointerX(clientX, rect.left, rect.width, dayCount);
    },
    [dayCount]
  );

  const finishDrag = useCallback(
    (startIdx: number, endIdx: number, roomIds: string[]) => {
      const interval = intervalFromDayIndices(dayIsos, startIdx, endIdx);
      if (!interval) return;
      const uniqueRooms = [...new Set(roomIds.length ? roomIds : [roomId])];
      onCreateDraft({
        roomId,
        roomIds: uniqueRooms,
        roomName:
          uniqueRooms.length > 1
            ? `${uniqueRooms.length} camere`
            : roomName,
        checkIn: interval.checkIn,
        checkOut: interval.checkOut,
        hasConflict: evalConflictForRooms(
          interval.checkIn,
          interval.checkOut,
          uniqueRooms
        ),
      });
      clearGanttRoomDragSpan();
    },
    [dayIsos, roomId, roomName, evalConflictForRooms, onCreateDraft]
  );

  const updateDragAt = useCallback(
    (clientX: number, clientY: number) => {
      const row = rowRef.current;
      if (!row || !dragRef.current || dayCount === 0) return;
      const rect = row.getBoundingClientRect();
      let endIdx = dayIndexFromPointerX(
        clientX,
        rect.left,
        rect.width,
        dayCount
      );
      const startIdx = dragRef.current.startIdx;
      if (endIdx < startIdx) endIdx = startIdx;
      const hitRoom = findGanttRoomAtPoint(clientX, clientY);
      const currentRoomId = hitRoom ?? dragRef.current.currentRoomId;
      const roomIds = roomIdsBetween(
        dragRef.current.orderedRoomIds,
        dragRef.current.startRoomId,
        currentRoomId
      );
      const interval = intervalFromDayIndices(dayIsos, startIdx, endIdx);
      const hasConflict = interval
        ? evalConflictForRooms(interval.checkIn, interval.checkOut, roomIds)
        : false;
      const ghost = ghostBarPosition(startIdx, endIdx, dayCount);
      if (ghost) {
        setGanttRoomDragSpan(roomIds, {
          leftPct: ghost.leftPct,
          widthPct: ghost.widthPct,
          hasConflict,
        });
      } else {
        setGanttRoomDragSpan(roomIds);
      }
      dragRef.current = {
        ...dragRef.current,
        endIdx,
        currentRoomId,
        selectedRoomIds: roomIds,
      };
      setDrag({ startIdx, endIdx, hasConflict, roomCount: roomIds.length });
    },
    [dayCount, dayIsos, evalConflictForRooms]
  );

  const beginDrag = useCallback(
    (startIdx: number, clientX: number, clientY: number) => {
      const ghost = ghostBarPosition(startIdx, startIdx, dayCount);
      const orderedRoomIds = listGanttRoomIdsInDomOrder();
      dragRef.current = {
        startIdx,
        endIdx: startIdx,
        startRoomId: roomId,
        currentRoomId: roomId,
        selectedRoomIds: [roomId],
        orderedRoomIds:
          orderedRoomIds.length > 0 ? orderedRoomIds : [roomId],
      };
      setDrag({
        startIdx,
        endIdx: startIdx,
        hasConflict: false,
        roomCount: 1,
      });
      if (ghost) {
        setGanttRoomDragSpan([roomId], {
          leftPct: ghost.leftPct,
          widthPct: ghost.widthPct,
          hasConflict: false,
        });
      } else {
        setGanttRoomDragSpan([roomId]);
      }
      updateDragAt(clientX, clientY);
    },
    [dayCount, roomId, updateDragAt]
  );

  const endDrag = useCallback(() => {
    if (longPressOpenedRef.current) {
      longPressOpenedRef.current = false;
      dragRef.current = null;
      setDrag(null);
      armedStartIdxRef.current = null;
      return;
    }
    if (!dragRef.current) return;
    finishDrag(
      dragRef.current.startIdx,
      dragRef.current.endIdx,
      dragRef.current.selectedRoomIds
    );
    dragRef.current = null;
    setDrag(null);
    armedStartIdxRef.current = null;
  }, [finishDrag]);

  useEffect(() => {
    if (!drag) return;

    const scrollEl = rowRef.current?.closest(".gantt-scroll");
    scrollEl?.classList.add("gantt-scroll--drag-lock");

    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();
      updateDragAt(e.clientX, e.clientY);
    };

    const onUp = () => {
      endDrag();
      clearGanttRoomDragSpan();
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      scrollEl?.classList.remove("gantt-scroll--drag-lock");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, updateDragAt, endDrag]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (pendingCtx?.pending) return;
      if (e.button !== 0) return;
      if (blocksDragCreate(e.target)) return;
      const row = rowRef.current;
      if (!row || dayCount === 0) return;

      longPressOpenedRef.current = false;
      pressOriginRef.current = { x: e.clientX, y: e.clientY };
      clearLongPress();
      const idx = dayIdxAt(e.clientX);
      armedStartIdxRef.current = idx;
      longPressTimerRef.current = setTimeout(() => {
        longPressOpenedRef.current = true;
        armedStartIdxRef.current = null;
        dragRef.current = null;
        setDrag(null);
        openEmptyMenu(e.clientX, e.clientY, idx);
      }, LONG_PRESS_MS);
      row.setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [dayCount, dayIdxAt, clearLongPress, openEmptyMenu, pendingCtx?.pending]
  );

  const onPointerUpRow = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      clearLongPress();
      pressOriginRef.current = null;
      armedStartIdxRef.current = null;

      try {
        rowRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      if (longPressOpenedRef.current) {
        longPressOpenedRef.current = false;
        dragRef.current = null;
        setDrag(null);
        clearGanttRoomDragSpan();
        return;
      }

      if (dragRef.current) {
        endDrag();
        clearGanttRoomDragSpan();
        return;
      }
    },
    [clearLongPress, endDrag]
  );

  const onPointerMoveRow = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const origin = pressOriginRef.current;
      if (origin && !longPressOpenedRef.current) {
        const dx = e.clientX - origin.x;
        const dy = e.clientY - origin.y;
        if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_PX) {
          clearLongPress();
          if (!dragRef.current) {
            beginDrag(armedStartIdxRef.current ?? dayIdxAt(origin.x), e.clientX, e.clientY);
          }
        }
      }
    },
    [beginDrag, clearLongPress, dayIdxAt]
  );

  const onPointerCancelRow = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      onPointerUpRow(e);
    },
    [onPointerUpRow]
  );

  const ghost =
    drag && dayCount > 0
      ? ghostBarPosition(drag.startIdx, drag.endIdx, dayCount)
      : null;

  const dragInterval =
    drag && dayCount > 0
      ? intervalFromDayIndices(dayIsos, drag.startIdx, drag.endIdx)
      : null;

  const nights =
    drag != null ? nightCountFromIndices(drag.startIdx, drag.endIdx) : 0;

  const dragPeriod =
    dragInterval != null
      ? formatStayPeriod(dragInterval.checkIn, dragInterval.checkOut, true)
      : "";

  return (
    <div
      ref={rowRef}
      data-gantt-room-row={roomId}
      className={[
          "gantt-drag-row relative w-full overflow-visible bg-white",
        touch && "gantt-drag-row--touch",
        drag && "gantt-drag-row--active",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ height: 56 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMoveRow}
      onPointerUp={onPointerUpRow}
      onPointerCancel={onPointerCancelRow}
      aria-label={`Trage spre dreapta pe ${roomName} pentru interval nou · click dreapta pentru meniu`}
    >
      <div className="pointer-events-none absolute inset-0">{renderGrid}</div>

      <div className="pointer-events-none absolute inset-0 z-[2]">
        <div className="relative h-full w-full">{children}</div>
      </div>

      {ghost && drag && (
        <div
          className={[
            "gantt-drag-preview pointer-events-none absolute top-2 z-[50] flex min-w-0 items-center overflow-hidden",
            drag.hasConflict
              ? "gantt-drag-preview--conflict"
              : "gantt-drag-preview--free",
          ].join(" ")}
          style={{
            left: `${ghost.leftPct}%`,
            width: `${ghost.widthPct}%`,
            minWidth: "2.75rem",
          }}
        >
          <span className="gantt-drag-preview__label truncate px-1.5">
            {drag.roomCount > 1 ? `${drag.roomCount} cam · ` : ""}
            {nights === 1 ? "1 noapte" : `${nights} nopți`}
            {ghost.widthPct > 8 ? ` · ${dragPeriod}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
