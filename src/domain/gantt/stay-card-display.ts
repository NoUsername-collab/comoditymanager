import { isOperativeCheckInDay } from "@/domain/booking/operative-checkin";
import {
  computeRoomCheckinProgress,
  shouldShowRoomCheckinProgress,
} from "@/domain/checkin/room-checkin-progress";
import type { StoredPaymentStatus } from "@/domain/checkin/types";
import { isIdentityStatusCritical } from "@/domain/guest/profile-data";
import type { GuestIdentityStatus } from "@/domain/guest/types";
import type { OccupancyPhase } from "@/domain/occupancy/types";
import { stayNightProgress } from "@/domain/gantt/stay-progress";

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
  if (args.compact) return null;

  const roomProgress = computeRoomCheckinProgress(
    args.roomNames,
    args.checkedInRooms,
  );

  const showRooms =
    !args.isCerere &&
    (isOperativeCheckInDay(args.bookingCheckIn, args.today) ||
      shouldShowRoomCheckinProgress(
        args.bookingCheckIn,
        args.today,
        roomProgress,
      ));

  if (showRooms) {
    const total = Math.max(roomProgress.total, 1);
    const checked = Math.min(roomProgress.checked, total);
    return {
      mode: "rooms",
      current: checked,
      total,
      pct: (checked / total) * 100,
    };
  }

  const nightProgress = stayNightProgress(
    args.segmentCheckIn,
    args.segmentCheckOut,
    args.today,
  );
  const showNights =
    !!nightProgress &&
    nightProgress.total > 1 &&
    args.occupancyPhase !== "past" &&
    (args.occupancyPhase === "active" || nightProgress.current > 0);

  if (!showNights || !nightProgress) return null;

  return {
    mode: "nights",
    current: nightProgress.current,
    total: nightProgress.total,
    pct: nightProgress.pct,
  };
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

export function shouldShowGanttStayAlerts(args: {
  progress: GanttStayBarProgress | null;
  bookingCheckIn: string;
  today: string;
  occupancyPhase: OccupancyPhase;
  isCerere: boolean;
}): boolean {
  if (args.isCerere || args.occupancyPhase === "past") return false;
  if (args.progress) return true;
  return isOperativeCheckInDay(args.bookingCheckIn, args.today);
}
