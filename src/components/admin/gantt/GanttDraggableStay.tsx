"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { shiftBookingOnGanttAction } from "@/app/admin/(panel)/calendar/actions";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import type { OccupancyPhase } from "@/domain/occupancy/types";
import { GanttBookingBar } from "@/components/admin/GanttBookingBar";
import type { GanttBarPosition } from "@/domain/gantt/bar-position";
import type { StayTodayHighlight } from "@/domain/gantt/today-activity";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { AdminAlertDialog } from "@/components/admin/overlay/AdminAlertDialog";
import {
  GanttStayPopover,
  type GanttStayPopoverData,
} from "./GanttStayPopover";

type Props = {
  href: string;
  label: string;
  pos: GanttBarPosition;
  isCerere: boolean;
  guestTotal: number;
  bookingId: string;
  dayCount: number;
  buildingColor?: string | null;
  todayHighlight?: StayTodayHighlight;
  initials?: string;
  popover: GanttStayPopoverData;
  occupancyPhase?: OccupancyPhase;
  onMoveRoom?: () => void;
};

export function GanttDraggableStay({
  href,
  label,
  pos,
  isCerere,
  guestTotal,
  bookingId,
  dayCount,
  buildingColor,
  todayHighlight,
  initials,
  popover,
  occupancyPhase,
  onMoveRoom,
}: Props) {
  const router = useRouter();
  const { notifyMoved } = useAdminFx();
  const [pending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(false);
  const [snapped, setSnapped] = useState(false);
  const [hover, setHover] = useState(false);
  const [popoverHover, setPopoverHover] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const startX = useRef(0);
  const rowWidth = useRef(0);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const title = [
    popover.guestName,
    formatStayPeriod(popover.checkIn, popover.checkOut),
    dragging ? "Trage pentru a muta" : "Trage stânga/dreapta · click pentru detalii",
  ].join(" · ");

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const el = e.currentTarget;
      const row = el.offsetParent as HTMLElement | null;
      rowWidth.current = row?.clientWidth ?? el.parentElement?.clientWidth ?? 1;
      startX.current = e.clientX;
      setDragging(true);
      setDragDelta(0);
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      setDragDelta(e.clientX - startX.current);
    },
    [dragging]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDragging(false);

      const w = rowWidth.current || 1;
      const dayDelta = Math.round((dragDelta / w) * dayCount);
      setDragDelta(0);

      if (dayDelta === 0) return;

      startTransition(async () => {
        const res = await shiftBookingOnGanttAction(bookingId, dayDelta);
        if (!res.ok) {
          setAlertMsg(res.error);
          return;
        }
        setSnapped(true);
        window.setTimeout(() => setSnapped(false), 360);
        notifyMoved();
        router.refresh();
      });
    },
    [dragging, dragDelta, dayCount, bookingId, router, notifyMoved]
  );

  const showPopover = (hover || popoverHover) && !dragging && !pending;

  const clearLeaveTimer = () => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  };

  const scheduleHidePopover = () => {
    clearLeaveTimer();
    leaveTimer.current = setTimeout(() => {
      setHover(false);
      setPopoverHover(false);
    }, 220);
  };

  const openBooking = useCallback(() => {
    router.push(`/admin/bookings/${bookingId}`);
  }, [router, bookingId]);

  return (
    <>
      <div
        data-gantt-block-interaction=""
        className={[
          "gantt-draggable-stay absolute top-2 z-[1] flex min-w-0 items-stretch",
          dragging && "z-[20] cursor-grabbing",
          pending && "opacity-60",
        ]
          .filter(Boolean)
          .join(" ")}
        onDoubleClick={(e) => {
          e.preventDefault();
          openBooking();
        }}
        style={{
          left: `calc(${pos.leftPct}% + ${dragDelta}px)`,
          width: `${pos.widthPct}%`,
          maxWidth: `${100 - pos.leftPct}%`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseEnter={(e) => {
          clearLeaveTimer();
          const rect = e.currentTarget.getBoundingClientRect();
          setAnchorRect(rect);
          hoverTimer.current = setTimeout(() => setHover(true), 200);
        }}
        onMouseLeave={() => {
          if (hoverTimer.current) clearTimeout(hoverTimer.current);
          scheduleHidePopover();
        }}
      >
        <GanttBookingBar
          href={href}
          label={label}
          title={title}
          pos={pos}
          isCerere={isCerere}
          guestTotal={guestTotal}
          buildingColor={buildingColor}
          todayHighlight={todayHighlight}
          initials={initials}
          interactive
          extraClass={snapped ? "gantt-stay-chrome--snapped" : undefined}
          occupancyPhase={occupancyPhase}
        />
      </div>
      <GanttStayPopover
        data={{
          ...popover,
          onMoveRoom: onMoveRoom
            ? () => {
                popover.onMoveRoom?.();
                onMoveRoom();
              }
            : popover.onMoveRoom,
        }}
        anchorRect={anchorRect}
        visible={showPopover}
        onMouseEnter={() => {
          clearLeaveTimer();
          setPopoverHover(true);
        }}
        onMouseLeave={scheduleHidePopover}
      />
      <AdminAlertDialog
        open={!!alertMsg}
        message={alertMsg ?? ""}
        onClose={() => setAlertMsg(null)}
      />
    </>
  );
}
