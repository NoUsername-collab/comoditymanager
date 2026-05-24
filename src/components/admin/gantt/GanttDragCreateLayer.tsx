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
import {
  GanttCreateDialog,
  type GanttCreateDraft,
} from "@/components/admin/gantt/GanttCreateDialog";

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
  const dragActive = useRef(false);
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

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const row = rowRef.current;
      if (!row || dayCount === 0) return;
      const rect = row.getBoundingClientRect();
      const idx = dayIndexFromPointerX(
        e.clientX,
        rect.left,
        rect.width,
        dayCount
      );
      dragActive.current = true;
      dragRef.current = { startIdx: idx, endIdx: idx };
      setDrag({ startIdx: idx, endIdx: idx, hasConflict: false });
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [dayCount]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragActive.current || !dragRef.current) return;
      const row = rowRef.current;
      if (!row) return;
      const rect = row.getBoundingClientRect();
      let endIdx = dayIndexFromPointerX(
        e.clientX,
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

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragActive.current || !dragRef.current) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      dragActive.current = false;
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

  return (
    <>
      <div
        ref={rowRef}
        className="relative w-full overflow-hidden bg-white"
        style={{ height: 56 }}
      >
        <div className="absolute inset-0 pointer-events-none">{renderGrid}</div>
        <div
          className={[
            "gantt-drag-create-layer absolute inset-0 z-[1]",
            touch && "gantt-drag-create-layer--touch",
          ]
            .filter(Boolean)
            .join(" ")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label={`Trage spre dreapta pe ${roomName} pentru interval nou`}
        />
        {ghost && drag && (
          <div
            className={[
              "gantt-drag-ghost pointer-events-none absolute top-2 z-[3] h-7 rounded-md border-2",
              drag.hasConflict
                ? "gantt-drag-ghost--conflict"
                : "gantt-drag-ghost--free",
            ].join(" ")}
            style={{
              left: `${ghost.leftPct}%`,
              width: `${ghost.widthPct}%`,
            }}
          />
        )}
        <div className="gantt-stays-layer absolute inset-0 z-[2] pointer-events-none">
          <div className="relative h-full w-full pointer-events-none">{children}</div>
        </div>
      </div>
      <GanttCreateDialog draft={draft} onClose={() => setDraft(null)} />
    </>
  );
}
