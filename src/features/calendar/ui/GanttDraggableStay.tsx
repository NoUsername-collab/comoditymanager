"use client";

import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useIsTouchDevice } from "@/hooks/useDeviceClass";
import { useAdminPending } from "@/components/admin/feedback/AdminPendingProvider";
import { useRouter } from "@/i18n/navigation";
import { useGanttContextMenu } from "@/features/calendar/ui/GanttContextMenuContext";
import { useGanttStayTapPopover } from "@/features/calendar/ui/GanttStayTapPopoverContext";
import {
  LONG_PRESS_MS,
  LONG_PRESS_MOVE_PX,
} from "@/domain/gantt/context-menu";
import type { MoveRoomDraft } from "@/features/calendar/ui/MoveRoomDialog";
import { computeRoomCheckinProgress } from "@/domain/checkin/room-checkin-progress";
import type { StoredPaymentStatus } from "@/domain/checkin/types";
import {
  isGanttBarCompact,
  isGanttStayMilestoneReached,
  isGanttStayMissingIdentity,
  isGanttStayUnpaid,
  resolveGanttEarlyDeparture,
  resolveGanttStayCapHealth,
  resolveGanttStayTimeline,
  shouldShowGanttStayAlerts,
  type GanttDeparturePolicy,
} from "@/domain/gantt/stay-card-display";
import type { GuestIdentityStatus } from "@/domain/guest/types";
import type { OccupancyPhase } from "@/domain/occupancy/types";
import { GanttBookingBar } from "@/features/calendar/ui/GanttBookingBar";
import type { GanttBarPosition } from "@/domain/gantt/bar-position";
import type { StayTodayHighlight } from "@/domain/gantt/today-activity";
import { formatStayPeriod } from "@/lib/ro-calendar";
import type { GanttStayPopoverData } from "./GanttStayPopover";
import { todayIso } from "@/lib/stay-dates";

const GanttStayPopover = dynamic(
  () =>
    import("./GanttStayPopover").then((m) => ({
      default: m.GanttStayPopover,
    })),
  { ssr: false, loading: () => null },
);

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
  bookingCheckOut: string;
  dayCount: number;
  compactLabel?: string;
  roomNames?: string[];
  checkedInRooms?: string[];
  keysHandedRooms?: string[];
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
  checkOutTime?: string;
  departurePolicy?: GanttDeparturePolicy;
};

export const GanttDraggableStay = memo(function GanttDraggableStay({
  href,
  label,
  pos,
  isCerere,
  guestTotal,
  bookingId,
  bookingCheckIn,
  bookingCheckOut,
  dayCount,
  compactLabel,
  roomNames = [],
  checkedInRooms = [],
  keysHandedRooms = [],
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
  checkOutTime = "12:00",
  departurePolicy,
}: Props) {
  const locale = useLocale();
  const tGantt = useTranslations("admin.gantt");
  const router = useRouter();
  const touch = useIsTouchDevice();
  const { openMenu } = useGanttContextMenu();
  const { openTapPopover, closeTapPopover, isTapOpen } = useGanttStayTapPopover();
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

  const keysProgress = useMemo(
    () =>
      roomNames.length > 1
        ? computeRoomCheckinProgress(roomNames, keysHandedRooms)
        : null,
    [roomNames, keysHandedRooms],
  );
  const showKeysMicro =
    keysProgress != null &&
    keysProgress.isMultiRoom &&
    keysProgress.checked > 0 &&
    keysProgress.isPartial;

  const checkoutUntil =
    departurePolicy?.checkoutTimeUntil ?? checkOutTime ?? "12:00";
  const earlyDeparture = resolveGanttEarlyDeparture({
    actualCheckOutAt,
    plannedCheckOut: bookingCheckOut,
    checkoutTimeUntil: checkoutUntil,
  });

  const earlyDepartureNote = useMemo(() => {
    const policy = departurePolicy ?? {
      earlyCheckoutAllowed: true,
      earlyCheckoutFee: 0,
      checkoutTimeUntil: checkoutUntil,
    };

    if (earlyDeparture) {
      if (!policy.earlyCheckoutAllowed) {
        return tGantt("stayCard.earlyDepartureRecordedBlocked");
      }
      if (policy.earlyCheckoutFee > 0) {
        return tGantt("stayCard.earlyDepartureRecordedFee", {
          fee: policy.earlyCheckoutFee,
        });
      }
      return tGantt("stayCard.earlyDepartureRecorded");
    }

    if (
      todayHighlight === "departure" &&
      !actualCheckOutAt &&
      !isCerere
    ) {
      if (!policy.earlyCheckoutAllowed) {
        return tGantt("stayCard.earlyDeparturePolicyBlocked", {
          until: checkoutUntil,
        });
      }
      if (policy.earlyCheckoutFee > 0) {
        return tGantt("stayCard.earlyDeparturePolicyFee", {
          fee: policy.earlyCheckoutFee,
          until: checkoutUntil,
        });
      }
      return tGantt("stayCard.earlyDeparturePolicy", { until: checkoutUntil });
    }

    return null;
  }, [
    actualCheckOutAt,
    checkoutUntil,
    departurePolicy,
    earlyDeparture,
    isCerere,
    tGantt,
    todayHighlight,
  ]);

  const milestoneReached = isGanttStayMilestoneReached({
    isCerere,
    roomNames,
    checkedInRooms,
    paymentStatus,
    totalPrice,
    bookingCheckIn,
    today: effectiveToday,
    occupancyPhase,
    guestId,
    identityStatus,
  });
  const checkinReady = milestoneReached;
  const capHealth = resolveGanttStayCapHealth({
    isCerere,
    occupancyPhase,
    showUnpaid,
    showMissingIdentity,
    milestoneReached,
    roomNames,
    checkedInRooms,
    bookingCheckIn,
    today: effectiveToday,
  });
  const capHealthLabel = useMemo(() => {
    if (capHealth === "ok") return tGantt("stayCard.milestoneDone");
    if (capHealth === "problem") {
      const parts: string[] = [];
      if (showUnpaid) parts.push(tGantt("stayCard.unpaid"));
      if (showMissingIdentity) parts.push(tGantt("stayCard.missingIdentity"));
      if (parts.length === 0) parts.push(tGantt("stayCard.milestonePending"));
      return parts.join(" · ");
    }
    return undefined;
  }, [capHealth, showUnpaid, showMissingIdentity, tGantt]);

  const title = [
    popover.guestName,
    formatStayPeriod(popover.checkIn, popover.checkOut, locale),
  ].join(" · ");

  const stayTapKey = `${bookingId}:${popover.roomId ?? ""}:${popover.checkIn}`;
  const tapPopoverOpen = touch && isTapOpen(stayTapKey);

  const popoverData = useMemo(
    (): GanttStayPopoverData => ({
      ...popover,
      keysHandedRooms,
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
    }),
    [
      popover,
      keysHandedRooms,
      stayTimeline,
      bookingCheckIn,
      effectiveToday,
      roomNames,
      checkedInRooms,
      occupancyPhase,
      isCerere,
      paymentStatus,
      totalPrice,
      guestId,
      identityStatus,
      showUnpaid,
      showMissingIdentity,
      onMoveRoom,
    ]
  );

  const openStayMenu = useCallback(
    (clientX: number, clientY: number) => {
      closeTapPopover();
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
      closeTapPopover,
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

    const finish = (e: PointerEvent) => {
      if (
        touch &&
        !longPressOpened.current &&
        e.pointerId === capturePointerId.current
      ) {
        const dx = e.clientX - startX.current;
        const dy = e.clientY - startY.current;
        if (Math.hypot(dx, dy) <= LONG_PRESS_MOVE_PX) {
          const el = captureEl.current;
          if (el) {
            const rect = el.getBoundingClientRect();
            setAnchorRect(rect);
            openTapPopover({
              key: stayTapKey,
              anchorRect: rect,
              data: popoverData,
            });
          }
        }
      }
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
        finish(e);
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
  }, [
    pressing,
    clearLongPress,
    releaseCapture,
    touch,
    stayTapKey,
    openTapPopover,
    popoverData,
  ]);

  const showPopover =
    !pressing && !pending && !touch && (hover || popoverHover);

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
          tapPopoverOpen && "gantt-draggable-stay--tap-open",
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
          keysMicroLabel={
            showKeysMicro && keysProgress
              ? `${keysProgress.checked}/${keysProgress.total}`
              : null
          }
          checkinReady={checkinReady}
          capHealth={capHealth}
          capHealthLabel={capHealthLabel}
          earlyDeparture={earlyDeparture}
          earlyDepartureNote={earlyDepartureNote}
        />
      </div>
      {showPopover && (
        <GanttStayPopover
          data={popoverData}
          anchorRect={anchorRect}
          visible
          onMouseEnter={() => {
            clearLeaveTimer();
            setPopoverHover(true);
          }}
          onMouseLeave={() => {
            clearLeaveTimer();
            scheduleHidePopover();
          }}
          today={today}
        />
      )}
    </>
  );
});
