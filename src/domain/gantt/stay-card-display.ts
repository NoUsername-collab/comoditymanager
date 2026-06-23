import { isOperativeCheckInDay } from "@/domain/booking/operative-checkin";
import { isEarlyDeparture } from "@/domain/booking/checkout-readiness";
import {
  computeRoomCheckinProgress,
  shouldShowRoomCheckinProgress,
} from "@/domain/checkin/room-checkin-progress";
import type { StoredPaymentStatus } from "@/domain/checkin/types";
import { isIdentityStatusCritical } from "@/domain/guest/profile-data";
import type { GuestIdentityStatus } from "@/domain/guest/types";
import type { OccupancyPhase } from "@/domain/occupancy/types";
import { stayNightProgress } from "@/domain/gantt/stay-progress";
import { isoToDatetimeLocal } from "@/lib/operational-check";

export type GanttDeparturePolicy = {
  earlyCheckoutAllowed: boolean;
  earlyCheckoutFee: number;
  checkoutTimeUntil: string | null;
};

export function resolveGanttEarlyDeparture(args: {
  actualCheckOutAt?: string | null;
  plannedCheckOut: string;
  checkoutTimeUntil: string | null;
}): boolean {
  if (!args.actualCheckOutAt?.trim()) return false;
  const atLocal = isoToDatetimeLocal(args.actualCheckOutAt);
  return isEarlyDeparture(atLocal, args.plannedCheckOut, {
    checkout_time_until: args.checkoutTimeUntil,
  });
}

const CHECKIN_SEG_MIN = 22;
const CHECKIN_SEG_MAX = 36;

export type GanttStayTimeline = {
  variant: "hybrid" | "checkin" | "nights";
  overallFillPct: number;
  checkinSegmentPct: number;
  roomsChecked: number;
  roomsTotal: number;
  roomsPct: number;
  milestoneReached: boolean;
  checkinStarted: boolean;
  nightsCurrent: number;
  nightsTotal: number;
  nightsPct: number;
};

/** @deprecated Folosește {@link GanttStayTimeline} */
export type GanttStayBarProgress = {
  mode: "nights" | "rooms";
  pct: number;
  current: number;
  total: number;
};

export function ganttBarVisibleDaySpan(widthPct: number, dayCount: number): number {
  if (dayCount <= 0) return 1;
  return Math.max(1, Math.round((widthPct / 100) * dayCount));
}

export function isGanttBarCompact(widthPct: number, dayCount: number): boolean {
  return ganttBarVisibleDaySpan(widthPct, dayCount) <= 2;
}

function checkinSegmentWidth(nightsTotal: number): number {
  if (nightsTotal <= 1) return 100;
  const proportional = (1 / nightsTotal) * 100 * 1.85;
  return Math.min(CHECKIN_SEG_MAX, Math.max(CHECKIN_SEG_MIN, proportional));
}

export function isGanttStayUnpaid(args: {
  isCerere: boolean;
  paymentStatus?: StoredPaymentStatus | null;
  totalPrice?: number | null;
  bookingCheckIn: string;
  today: string;
  occupancyPhase: OccupancyPhase;
}): boolean {
  if (args.isCerere || args.occupancyPhase === "past") return false;

  if (args.paymentStatus === "unpaid" || args.paymentStatus === "partial") {
    return true;
  }
  if (args.paymentStatus === "paid") return false;

  return (
    isOperativeCheckInDay(args.bookingCheckIn, args.today) &&
    (args.totalPrice ?? 0) > 0
  );
}

export function isGanttStayMissingIdentity(args: {
  guestId?: string | null;
  identityStatus?: GuestIdentityStatus | null;
}): boolean {
  if (!args.guestId) return true;
  return isIdentityStatusCritical(args.identityStatus);
}

export function isGanttStayMilestoneReached(args: {
  isCerere: boolean;
  roomNames: string[];
  checkedInRooms: string[];
  paymentStatus?: StoredPaymentStatus | null;
  totalPrice?: number | null;
  bookingCheckIn: string;
  today: string;
  occupancyPhase: OccupancyPhase;
  guestId?: string | null;
  identityStatus?: GuestIdentityStatus | null;
}): boolean {
  if (args.isCerere) return false;

  const rooms = computeRoomCheckinProgress(args.roomNames, args.checkedInRooms);
  if (!rooms.isComplete) return false;

  return (
    !isGanttStayUnpaid({
      isCerere: false,
      paymentStatus: args.paymentStatus,
      totalPrice: args.totalPrice,
      bookingCheckIn: args.bookingCheckIn,
      today: args.today,
      occupancyPhase: args.occupancyPhase,
    }) &&
    !isGanttStayMissingIdentity({
      guestId: args.guestId,
      identityStatus: args.identityStatus,
    })
  );
}

function needsCheckinSegment(args: {
  isCerere: boolean;
  milestoneReached: boolean;
  bookingCheckIn: string;
  today: string;
  roomNames: string[];
  checkedInRooms: string[];
  occupancyPhase: OccupancyPhase;
}): boolean {
  if (args.isCerere || args.milestoneReached) return false;

  const rooms = computeRoomCheckinProgress(args.roomNames, args.checkedInRooms);
  if (isOperativeCheckInDay(args.bookingCheckIn, args.today)) return true;
  if (rooms.checked > 0) return true;

  return (
    shouldShowRoomCheckinProgress(args.bookingCheckIn, args.today, rooms) &&
    args.occupancyPhase !== "past"
  );
}

export function resolveGanttStayTimeline(args: {
  segmentCheckIn: string;
  segmentCheckOut: string;
  bookingCheckIn: string;
  today: string;
  roomNames: string[];
  checkedInRooms: string[];
  occupancyPhase: OccupancyPhase;
  isCerere: boolean;
  compact: boolean;
  paymentStatus?: StoredPaymentStatus | null;
  totalPrice?: number | null;
  guestId?: string | null;
  identityStatus?: GuestIdentityStatus | null;
}): GanttStayTimeline | null {
  if (args.compact || args.isCerere || args.occupancyPhase === "past") return null;

  const nightProgress = stayNightProgress(
    args.segmentCheckIn,
    args.segmentCheckOut,
    args.today,
  );
  if (!nightProgress || nightProgress.total <= 0) return null;

  const rooms = computeRoomCheckinProgress(args.roomNames, args.checkedInRooms);
  const roomsTotal = Math.max(rooms.total, 1);
  const roomsChecked = Math.min(rooms.checked, roomsTotal);
  const roomsPct = (roomsChecked / roomsTotal) * 100;

  const milestoneReached = isGanttStayMilestoneReached({
    isCerere: args.isCerere,
    roomNames: args.roomNames,
    checkedInRooms: args.checkedInRooms,
    paymentStatus: args.paymentStatus,
    totalPrice: args.totalPrice,
    bookingCheckIn: args.bookingCheckIn,
    today: args.today,
    occupancyPhase: args.occupancyPhase,
    guestId: args.guestId,
    identityStatus: args.identityStatus,
  });

  const showCheckin = needsCheckinSegment({
    isCerere: args.isCerere,
    milestoneReached,
    bookingCheckIn: args.bookingCheckIn,
    today: args.today,
    roomNames: args.roomNames,
    checkedInRooms: args.checkedInRooms,
    occupancyPhase: args.occupancyPhase,
  });

  const onCheckInDay = isOperativeCheckInDay(args.bookingCheckIn, args.today);
  const checkinStarted = roomsChecked > 0 || onCheckInDay;

  let variant: GanttStayTimeline["variant"];
  if (showCheckin && nightProgress.total > 1) {
    variant = "hybrid";
  } else if (showCheckin) {
    variant = "checkin";
  } else if (
    nightProgress.total > 1 &&
    (args.occupancyPhase === "active" || nightProgress.current > 0)
  ) {
    variant = "nights";
  } else {
    return null;
  }

  const checkinSegmentPct =
    variant === "hybrid" ? checkinSegmentWidth(nightProgress.total) : 100;
  const nightsPct = nightProgress.pct;

  let overallFillPct: number;
  if (variant === "checkin") {
    overallFillPct = roomsPct;
  } else if (variant === "nights") {
    overallFillPct = nightsPct;
  } else if (!milestoneReached) {
    overallFillPct = checkinSegmentPct * (roomsPct / 100);
  } else {
    const stayPortion = 100 - checkinSegmentPct;
    overallFillPct = checkinSegmentPct + stayPortion * (nightsPct / 100);
  }

  return {
    variant,
    overallFillPct,
    checkinSegmentPct,
    roomsChecked,
    roomsTotal,
    roomsPct,
    milestoneReached,
    checkinStarted,
    nightsCurrent: nightProgress.current,
    nightsTotal: nightProgress.total,
    nightsPct,
  };
}

/** @deprecated Folosește {@link resolveGanttStayTimeline} */
export function resolveGanttStayBarProgress(args: {
  segmentCheckIn: string;
  segmentCheckOut: string;
  bookingCheckIn: string;
  today: string;
  roomNames: string[];
  checkedInRooms: string[];
  occupancyPhase: OccupancyPhase;
  isCerere: boolean;
  compact: boolean;
}): GanttStayBarProgress | null {
  const timeline = resolveGanttStayTimeline({ ...args });
  if (!timeline) return null;

  if (timeline.variant === "nights") {
    return {
      mode: "nights",
      current: timeline.nightsCurrent,
      total: timeline.nightsTotal,
      pct: timeline.nightsPct,
    };
  }

  return {
    mode: "rooms",
    current: timeline.roomsChecked,
    total: timeline.roomsTotal,
    pct: timeline.roomsPct,
  };
}

export function shouldShowGanttPopoverRoomKeys(
  timeline: GanttStayTimeline,
  hasRecordedCheckIn: boolean
): boolean {
  if (timeline.roomsTotal <= 1) return false;
  return (
    hasRecordedCheckIn ||
    timeline.checkinStarted ||
    timeline.roomsChecked > 0
  );
}

export function shouldShowGanttPopoverNights(
  timeline: GanttStayTimeline
): boolean {
  return timeline.nightsTotal > 1 && timeline.variant !== "checkin";
}

export function shouldShowGanttStayAlerts(args: {
  timeline: GanttStayTimeline | null;
  bookingCheckIn: string;
  today: string;
  occupancyPhase: OccupancyPhase;
  isCerere: boolean;
}): boolean {
  if (args.isCerere || args.occupancyPhase === "past") return false;
  if (args.timeline) return true;
  return isOperativeCheckInDay(args.bookingCheckIn, args.today);
}

/** Capăt dreapta — bec OK vs roșu problemă pe carduri Gantt. */
export type GanttStayCapHealth = "neutral" | "ok" | "problem";

export function resolveGanttStayCapHealth(args: {
  isCerere: boolean;
  occupancyPhase: OccupancyPhase;
  showUnpaid: boolean;
  showMissingIdentity: boolean;
  milestoneReached: boolean;
  roomNames: string[];
  checkedInRooms: string[];
  bookingCheckIn: string;
  today: string;
}): GanttStayCapHealth {
  if (args.isCerere || args.occupancyPhase === "past") {
    return "neutral";
  }

  if (args.milestoneReached) {
    return "ok";
  }

  if (args.showUnpaid || args.showMissingIdentity) {
    return "problem";
  }

  const rooms = computeRoomCheckinProgress(
    args.roomNames,
    args.checkedInRooms,
  );
  const onCheckInDay = isOperativeCheckInDay(args.bookingCheckIn, args.today);
  if ((onCheckInDay || rooms.checked > 0) && !rooms.isComplete) {
    return "problem";
  }

  return "neutral";
}
