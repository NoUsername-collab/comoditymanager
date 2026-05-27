"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useIsTouchDevice } from "@/hooks/useDeviceClass";
import { useAdminPending, useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";
import { useRouter } from "@/i18n/navigation";
import {
  moveBookingRoomFromPivotAction,
  shiftBookingOnGanttAction,
} from "@/app/[locale]/admin/(panel)/calendar/actions";
import {
  clearGanttRoomDropTargets,
  findGanttRoomAtPoint,
  getGanttRoomDragLayer,
  setGanttRoomDropTarget,
} from "@/domain/gantt/room-at-point";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { useGanttContextMenu } from "@/components/admin/gantt/GanttContextMenuContext";
import {
  LONG_PRESS_MS,
  LONG_PRESS_MOVE_PX,
} from "@/domain/gantt/context-menu";
import type { MoveRoomDraft } from "@/components/admin/gantt/MoveRoomDialog";
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
import { addDays } from "@/lib/stay-dates";
import { dayIndexFromPointerX } from "@/domain/gantt/drag-create";

const DRAG_BLOCK_SELECTOR = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "label",
  "summary",
  "details",
  "[role='button']",
  "[contenteditable='true']",
  "[data-gantt-no-drag]",
  "[data-admin-overlay]",
  ".admin-floating-panel",
].join(", ");

function blocksStayDragStart(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest(DRAG_BLOCK_SELECTOR);
}

function shouldUseVerticalDrag(canVerticalMove: boolean, dx: number, dy: number): boolean {
  if (!canVerticalMove) return false;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  return absY >= 24 && absY > absX * 1.35;
}

type Props = {
  href: string;
  label: string;
  pos: GanttBarPosition;
  isCerere: boolean;
  guestTotal: number;
  bookingId: string;
  dayIsos: string[];
  bookingCheckIn: string;
  buildingColor?: string | null;
  todayHighlight?: StayTodayHighlight;
  initials?: string;
  popover: GanttStayPopoverData;
  actualCheckInAt?: string | null;
  actualCheckOutAt?: string | null;
  occupancyPhase?: OccupancyPhase;
  guestId?: string | null;
  moveRoomDraft?: MoveRoomDraft | null;
  sourceRoomId?: string;
  canVerticalMove?: boolean;
  onMoveRoom?: () => void;
};

export function GanttDraggableStay({
  href,
  label,
  pos,
  isCerere,
  guestTotal,
  bookingId,
  dayIsos,
  bookingCheckIn,
  buildingColor,
  todayHighlight,
  initials,
  popover,
  actualCheckInAt = null,
  actualCheckOutAt = null,
  occupancyPhase,
  guestId,
  moveRoomDraft,
  sourceRoomId = "",
  canVerticalMove = false,
  onMoveRoom,
}: Props) {
  const tGantt = useTranslations("admin.gantt");
  const locale = useLocale();
  const router = useRouter();
  const touch = useIsTouchDevice();
  const { openMenu } = useGanttContextMenu();
  const { notifyMoved } = useAdminFx();
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();
  const [interaction, setInteraction] = useState<"idle" | "armed" | "dragging">("idle");
  const [snapped, setSnapped] = useState(false);
  const [hover, setHover] = useState(false);
  const [popoverHover, setPopoverHover] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const [dragDeltaY, setDragDeltaY] = useState(0);
  const [verticalMode, setVerticalMode] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const targetRoomRef = useRef<string | null>(null);
  const dragDeltaRef = useRef(0);
  const dragDeltaYRef = useRef(0);
  const lastPointerX = useRef(0);
  const lastPointerY = useRef(0);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressOpened = useRef(false);
  const captureEl = useRef<HTMLDivElement | null>(null);
  const capturePointerId = useRef<number | null>(null);

  const dragging = interaction === "dragging";
  const visibleDayCount = dayIsos.length;

  const title = [
    popover.guestName,
    formatStayPeriod(popover.checkIn, popover.checkOut, locale),
    dragging
      ? verticalMode
        ? tGantt("drag.dragOtherRow")
        : tGantt("drag.leftRightDatesUpDownRoom")
      : tGantt("drag.defaultHint"),
  ].join(" · ");

  const openStayMenu = useCallback(
    (clientX: number, clientY: number) => {
      openMenu({
        kind: "stay",
        clientX,
        clientY,
        bookingId,
        guestId: guestId ?? null,
        guestName: popover.guestName,
        status: popover.status,
        actualCheckInAt,
        actualCheckOutAt,
        plannedCheckIn: popover.checkIn,
        plannedCheckOut: popover.checkOut,
        canMoveRoom: !!popover.canMoveRoom && !!moveRoomDraft,
        moveRoomDraft: moveRoomDraft ?? null,
        popover: {
          ...popover,
          onMoveRoom,
        },
      });
    },
    [
      openMenu,
      bookingId,
      guestId,
      popover,
      actualCheckInAt,
      actualCheckOutAt,
      moveRoomDraft,
      onMoveRoom,
    ]
  );

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (pending) return;
      if (e.button !== 0) return;
      if (blocksStayDragStart(e.target)) {
        e.stopPropagation();
        return;
      }
      e.stopPropagation();
      const el = e.currentTarget;
      startX.current = e.clientX;
      startY.current = e.clientY;
      lastPointerX.current = e.clientX;
      lastPointerY.current = e.clientY;
      targetRoomRef.current = null;
      longPressOpened.current = false;
      setVerticalMode(false);
      setDragDelta(0);
      setDragDeltaY(0);
      setInteraction("armed");
      captureEl.current = el;
      capturePointerId.current = e.pointerId;
      clearLongPress();
      longPressTimer.current = setTimeout(() => {
        longPressOpened.current = true;
        setInteraction("idle");
        openStayMenu(e.clientX, e.clientY);
      }, LONG_PRESS_MS);
      el.setPointerCapture(e.pointerId);
    },
    [clearLongPress, openStayMenu, pending]
  );

  useEffect(() => {
    if (interaction !== "armed" && interaction !== "dragging") return;

    const onMove = (e: PointerEvent) => {
      if (interaction === "armed") {
        const dx = e.clientX - startX.current;
        const dy = e.clientY - startY.current;
        if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_PX && !longPressOpened.current) {
          clearLongPress();
          lastPointerX.current = e.clientX;
          lastPointerY.current = e.clientY;
          setDragDelta(dx);
          setDragDeltaY(dy);
          dragDeltaRef.current = dx;
          dragDeltaYRef.current = dy;
          const isVertical = shouldUseVerticalDrag(canVerticalMove, dx, dy);
          setVerticalMode(isVertical);
          if (isVertical) {
            const target = findGanttRoomAtPoint(e.clientX, e.clientY);
            targetRoomRef.current = target;
            setGanttRoomDropTarget(
              target && target !== sourceRoomId ? target : null
            );
          } else {
            targetRoomRef.current = null;
            setGanttRoomDropTarget(null);
          }
          setInteraction("dragging");
        }
        return;
      }

      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;
      lastPointerX.current = e.clientX;
      lastPointerY.current = e.clientY;
      setDragDelta(dx);
      setDragDeltaY(dy);
      dragDeltaRef.current = dx;
      dragDeltaYRef.current = dy;
      const isVertical = shouldUseVerticalDrag(canVerticalMove, dx, dy);
      setVerticalMode(isVertical);
      if (isVertical) {
        const target = findGanttRoomAtPoint(e.clientX, e.clientY);
        targetRoomRef.current = target;
        setGanttRoomDropTarget(
          target && target !== sourceRoomId ? target : null
        );
      } else {
        targetRoomRef.current = null;
        setGanttRoomDropTarget(null);
      }
    };

    const finish = (e?: PointerEvent) => {
      clearLongPress();
      const el = captureEl.current;
      const pid = capturePointerId.current;
      if (el && pid != null) {
        try {
          el.releasePointerCapture(pid);
        } catch {
          /* ignore */
        }
      }
      captureEl.current = null;
      capturePointerId.current = null;

      if (interaction === "armed" || longPressOpened.current) {
        setInteraction("idle");
        return;
      }

      setInteraction("idle");
      clearGanttRoomDropTargets();
      const dx = dragDeltaRef.current;
      const dy = dragDeltaYRef.current;
      const clientX = e?.clientX ?? lastPointerX.current;
      const clientY = e?.clientY ?? lastPointerY.current;
      const isVertical = shouldUseVerticalDrag(canVerticalMove, dx, dy);
      const targetRoom =
        targetRoomRef.current ?? findGanttRoomAtPoint(clientX, clientY);
      setDragDelta(0);
      setDragDeltaY(0);
      setVerticalMode(false);
      targetRoomRef.current = null;

      if (isVertical && targetRoom && targetRoom !== sourceRoomId) {
        void runAdminAction(async () => {
          const res = await moveBookingRoomFromPivotAction({
            bookingId,
            sourceRoomId,
            targetRoomId: targetRoom,
          });
          if (!res.ok) {
            setAlertMsg(res.error);
            return;
          }
          setSnapped(true);
          window.setTimeout(() => setSnapped(false), 360);
          notifyMoved(tGantt("moveRoom.moved"), popover.guestName);
          router.refresh();
        });
        return;
      }

      if (visibleDayCount === 0) return;

      const targetLayer =
        getGanttRoomDragLayer(targetRoom ?? sourceRoomId) ??
        getGanttRoomDragLayer(sourceRoomId);
      if (!targetLayer) return;

      const gridRect = targetLayer.getBoundingClientRect();
      if (gridRect.width <= 0) return;

      const dayWidth = gridRect.width / visibleDayCount;
      if (dayWidth <= 0) return;

      const pointerDayIndex = dayIndexFromPointerX(
        clientX,
        gridRect.left,
        gridRect.width,
        visibleDayCount
      );
      const visualStartIndex = Math.max(
        0,
        Math.min(visibleDayCount - 1, Math.floor((pos.leftPct / 100) * visibleDayCount))
      );
      const dayDelta = pointerDayIndex - visualStartIndex;
      const targetCheckIn = addDays(bookingCheckIn, dayDelta);
      if (targetCheckIn === bookingCheckIn) return;

      void runAdminAction(async () => {
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
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      clearGanttRoomDropTargets();
    };
  }, [
    interaction,
    clearLongPress,
    canVerticalMove,
    sourceRoomId,
    bookingId,
    bookingCheckIn,
    dayIsos,
    router,
    notifyMoved,
    popover.guestName,
    pos.leftPct,
    runAdminAction,
    visibleDayCount,
  ]);

  const showPopover =
    !touch && (hover || popoverHover) && interaction === "idle" && !pending;

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
        data-gantt-stay=""
        className={[
          "gantt-draggable-stay pointer-events-auto absolute top-2 z-[1] flex min-w-0 items-stretch",
          dragging && "cursor-grabbing",
          dragging && "gantt-draggable-stay--dragging",
          dragging && !verticalMode && "z-[20]",
          verticalMode && "gantt-draggable-stay--vertical",
          pending && "opacity-60",
        ]
          .filter(Boolean)
          .join(" ")}
        onDoubleClick={(e) => {
          e.preventDefault();
          openBooking();
        }}
        style={{
          left: `${pos.leftPct}%`,
          width: `${pos.widthPct}%`,
          maxWidth: `${100 - pos.leftPct}%`,
          transform: dragging
            ? `translate(${dragDelta}px, ${dragDeltaY}px)`
            : undefined,
        }}
        onPointerDown={onPointerDown}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openStayMenu(e.clientX, e.clientY);
        }}
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
