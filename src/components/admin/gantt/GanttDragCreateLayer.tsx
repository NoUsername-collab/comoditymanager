"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { findOccupancyConflicts } from "@/domain/occupancy/conflict";
import type { OccupancySegment } from "@/domain/occupancy/types";
import {
  dayIndexFromPointerX,
  ghostBarPosition,
  intervalFromDayIndices,
} from "@/domain/gantt/drag-create";
import type { GanttViewRange } from "@/domain/gantt/view-range";
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
} from "@/lib/constants";
import { formatStayPeriod } from "@/lib/ro-calendar";
import {
  GanttCreateDialog,
  type GanttCreateDraft,
} from "@/components/admin/gantt/GanttCreateDialog";

const INTERACTIVE_SELECTOR =
  ".gantt-draggable-stay, .gantt-occ-bar, .gantt-timeline-bar, a, button";

type Props = {
  roomId: string;
  roomName: string;
  viewRange: GanttViewRange;
  occupancy: OccupancySegment[];
  checkInTime?: string;
  checkOutTime?: string;
  touch: boolean;
  renderGrid: ReactNode;
  children: ReactNode;
};

type DragState = {
  startIdx: number;
  endIdx: number;
  hasConflict: boolean;
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest(INTERACTIVE_SELECTOR);
}

function nightCountFromIndices(startIdx: number, endIdx: number): number {
  return Math.max(1, endIdx - startIdx + 1);
}

export function GanttDragCreateLayer({
  roomId,
  roomName,
  viewRange,
  occupancy,
  checkInTime = DEFAULT_CHECK_IN_TIME,
  checkOutTime = DEFAULT_CHECK_OUT_TIME,
  touch,
  renderGrid,
  children,
}: Props) {
  const rowRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startIdx: number; endIdx: number } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [draft, setDraft] = useState<GanttCreateDraft | null>(null);

  const dayIsos = viewRange.days.map((d) => d.iso);
  const dayCount = dayIsos.length;
  const roomOccupancy = occupancy.filter((s) => s.roomId === roomId);

  const evalConflict = useCallback(
    (checkIn: string, checkOut: string) => {
      const conflicts = findOccupancyConflicts(
        [roomId],
        checkIn,
        checkOut,
        roomOccupancy,
        undefined,
        { checkIn: checkInTime, checkOut: checkOutTime }
      );
      return conflicts.length > 0;
    },
    [roomId, roomOccupancy, checkInTime, checkOutTime]
  );

  const finishDrag = useCallback(
    (startIdx: number, endIdx: number) => {
      const interval = intervalFromDayIndices(dayIsos, startIdx, endIdx);
      if (!interval) return;
      setDraft({
        roomId,
        roomName,
        checkIn: interval.checkIn,
        checkOut: interval.checkOut,
        hasConflict: evalConflict(interval.checkIn, interval.checkOut),
      });
    },
    [dayIsos, roomId, roomName, evalConflict]
  );

  const updateDragAt = useCallback(
    (clientX: number) => {
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
      const interval = intervalFromDayIndices(dayIsos, startIdx, endIdx);
      const hasConflict = interval
        ? evalConflict(interval.checkIn, interval.checkOut)
        : false;
      dragRef.current = { startIdx, endIdx };
      setDrag({ startIdx, endIdx, hasConflict });
    },
    [dayCount, dayIsos, evalConflict]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if (isInteractiveTarget(e.target)) return;
      const row = rowRef.current;
      if (!row || dayCount === 0) return;

      const rect = row.getBoundingClientRect();
      const idx = dayIndexFromPointerX(
        e.clientX,
        rect.left,
        rect.width,
        dayCount
      );
      dragRef.current = { startIdx: idx, endIdx: idx };
      setDrag({ startIdx: idx, endIdx: idx, hasConflict: false });
      row.setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [dayCount]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      updateDragAt(e.clientX);
    },
    [updateDragAt]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      finishDrag(dragRef.current.startIdx, dragRef.current.endIdx);
      dragRef.current = null;
      setDrag(null);
    },
    [finishDrag]
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
    <>
      <div
        ref={rowRef}
        className={[
          "gantt-drag-row relative w-full overflow-hidden bg-white",
          touch && "gantt-drag-row--touch",
          drag && "gantt-drag-row--active",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ height: 56 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={`Trage spre dreapta pe ${roomName} pentru interval nou`}
      >
        <div className="pointer-events-none absolute inset-0">{renderGrid}</div>

        <div className="pointer-events-none absolute inset-0 z-[2]">
          <div className="relative h-full w-full">{children}</div>
        </div>

        {ghost && drag && (
          <div
            className={[
              "gantt-drag-preview pointer-events-none absolute top-2 z-[30] flex min-w-0 items-center overflow-hidden",
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
              {nights === 1 ? "1 noapte" : `${nights} nopți`}
              {ghost.widthPct > 8 ? ` · ${dragPeriod}` : ""}
            </span>
          </div>
        )}
      </div>
      <GanttCreateDialog draft={draft} onClose={() => setDraft(null)} />
    </>
  );
}
