"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useIsTouchDevice } from "@/hooks/useDeviceClass";
import { useAdminPending } from "@/components/admin/feedback/AdminPendingProvider";
import { useRouter } from "@/i18n/navigation";
import { useGanttContextMenu } from "@/components/admin/gantt/GanttContextMenuContext";
import {
  LONG_PRESS_MS,
  LONG_PRESS_MOVE_PX,
} from "@/domain/gantt/context-menu";
import type { MoveRoomDraft } from "@/components/admin/gantt/MoveRoomDialog";
import type { StoredPaymentStatus } from "@/domain/checkin/types";
import {
  isGanttBarCompact,
  isGanttStayMissingIdentity,
  isGanttStayUnpaid,
  resolveGanttStayTimeline,
  shouldShowGanttStayAlerts,
} from "@/domain/gantt/stay-card-display";
import type { GuestIdentityStatus } from "@/domain/guest/types";
import type { OccupancyPhase } from "@/domain/occupancy/types";
import { GanttBookingBar } from "@/components/admin/GanttBookingBar";
import type { GanttBarPosition } from "@/domain/gantt/bar-position";
import type { StayTodayHighlight } from "@/domain/gantt/today-activity";
import { formatStayPeriod } from "@/lib/ro-calendar";
import {
  GanttStayPopover,
  type GanttStayPopoverData,
} from "./GanttStayPopover";
import { todayIso } from "@/lib/stay-dates";

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

type Props = {
  href: string;
  label: string;
  pos: GanttBarPosition;
  isCerere: boolean;
  guestTotal: number;
  bookingId: string;
  bookingCheckIn: string;
  dayCount: number;
  compactLabel?: string;
  roomNames?: string[];
  checkedInRooms?: string[];
  paymentStatus?: StoredPaymentStatus | null;
  identityStatus?: GuestIdentityStatus | null;
  totalPrice?: number | null;
  buildingColor?: string | null;
  todayHighlight?: StayTodayHighlight;
  initials?: string;
  popover: GanttStayPopoverData;
  actualCheckInAt?: string | null;
  actualCheckOutAt?: string | null;
  occupancyPhase?: OccupancyPhase;
  roomIds?: string[];
  guestId?: string | null;
  moveRoomDraft?: MoveRoomDraft | null;
  onMoveRoom?: () => void;
  today?: string;
};

export const GanttDraggableStay = memo(function GanttDraggableStay({
  href,
  label,
  pos,
  isCerere,
  guestTotal,
  bookingId,
  bookingCheckIn,
  dayCount,
  compactLabel,
  roomNames = [],
  checkedInRooms = [],
  paymentStatus = null,
  identityStatus = null,
  totalPrice = null,
  buildingColor,
  todayHighlight,
  initials,
  popover,
  actualCheckInAt = null,
  actualCheckOutAt = null,
  occupancyPhase = "active",
  roomIds = [],
  guestId,
  moveRoomDraft,
  onMoveRoom,
  today,
}: Props) {
  const locale = useLocale();
  const router = useRouter();
  const touch = useIsTouchDevice();
  const { openMenu } = useGanttContextMenu();
  const { pending } = useAdminPending();
  const [pressing, setPressing] = useState(false);
  const [hover, setHover] = useState(false);
  const [popoverHover, setPopoverHover] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressOpened = useRef(false);
  const captureEl = useRef<HTMLDivElement | null>(null);
  const capturePointerId = useRef<number | null>(null);

  const effectiveToday = today ?? todayIso();
  const compact = isGanttBarCompact(pos.widthPct, dayCount);
  const displayLabel = compact && compactLabel ? compactLabel : label;
  const stayTimeline = resolveGanttStayTimeline({
    segmentCheckIn: popover.checkIn,
    segmentCheckOut: popover.checkOut,
    bookingCheckIn,
    today: effectiveToday,
    roomNames,
    checkedInRooms,
    occupancyPhase,
    isCerere,
    compact,
    paymentStatus,
    totalPrice,
    guestId,
    identityStatus,
  });
  const showAlerts = shouldShowGanttStayAlerts({
    timeline: stayTimeline,
    bookingCheckIn,
    today: effectiveToday,
    occupancyPhase,
    isCerere,
  });
  const showUnpaid =
    showAlerts &&
    isGanttStayUnpaid({
      isCerere,
      paymentStatus,
      totalPrice,
      bookingCheckIn,
      today: effectiveToday,
      occupancyPhase,
    });
  const showMissingIdentity =
    showAlerts &&
    isGanttStayMissingIdentity({
      guestId,
      identityStatus,
    });

  const title = [
    popover.guestName,
    formatStayPeriod(popover.checkIn, popover.checkOut, locale),
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
        occupancyPhase,
        today: today ?? todayIso(),
        roomIds,
        actualCheckInAt,
        actualCheckOutAt,
        plannedCheckIn: bookingCheckIn,
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
      bookingCheckIn,
      guestId,
      popover,
      occupancyPhase,
      today,
      roomIds,
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

  const releaseCapture = useCallback(() => {
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
      longPressOpened.current = false;
      setPressing(true);
      captureEl.current = el;
      capturePointerId.current = e.pointerId;
      clearLongPress();
      longPressTimer.current = setTimeout(() => {
        longPressOpened.current = true;
        clearLongPress();
        releaseCapture();
        setPressing(false);
        openStayMenu(e.clientX, e.clientY);
      }, LONG_PRESS_MS);
      if (!touch) {
        el.setPointerCapture(e.pointerId);
      }
    },
    [clearLongPress, openStayMenu, pending, releaseCapture, touch]
  );

  useEffect(() => {
    if (!pressing) return;

    const finish = () => {
      clearLongPress();
      releaseCapture();
      setPressing(false);
    };

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;
      if (
        Math.hypot(dx, dy) > LONG_PRESS_MOVE_PX &&
        !longPressOpened.current
      ) {
        finish();
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [pressing, clearLongPress, releaseCapture]);

  const showPopover =
    !touch && (hover || popoverHover) && !pressing && !pending;

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
          "gantt-draggable-stay pointer-events-auto absolute z-[1] flex min-w-0 items-stretch",
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
          label={displayLabel}
          title={title}
          pos={pos}
          isCerere={isCerere}
          guestTotal={guestTotal}
          buildingColor={buildingColor}
          todayHighlight={todayHighlight}
          initials={initials}
          interactive
          occupancyPhase={occupancyPhase}
          compact={compact}
          timeline={stayTimeline}
          showUnpaid={showUnpaid}
          showMissingIdentity={showMissingIdentity}
        />
      </div>
      {showPopover && (
        <GanttStayPopover
          data={{
            ...popover,
            timeline:
              stayTimeline ??
              resolveGanttStayTimeline({
                segmentCheckIn: popover.checkIn,
                segmentCheckOut: popover.checkOut,
                bookingCheckIn,
                today: effectiveToday,
                roomNames,
                checkedInRooms,
                occupancyPhase,
                isCerere,
                compact: false,
                paymentStatus,
                totalPrice,
                guestId,
                identityStatus,
              }),
            showUnpaid,
            showMissingIdentity,
            onMoveRoom: onMoveRoom
              ? () => {
                  popover.onMoveRoom?.();
                  onMoveRoom();
                }
              : popover.onMoveRoom,
          }}
          anchorRect={anchorRect}
          visible
          onMouseEnter={() => {
            clearLeaveTimer();
            setPopoverHover(true);
          }}
          onMouseLeave={scheduleHidePopover}
          today={today}
        />
      )}
    </>
  );
});
