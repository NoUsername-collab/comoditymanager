import { nightOccupied, todayIso } from "@/lib/stay-dates";
import type { BookingRow } from "@/services/bookings";

export type RoomTodayFlags = {
  arrival: boolean;
  departure: boolean;
  occupiedTonight: boolean;
};

export type GanttTodaySummary = {
  todayIso: string;
  inView: boolean;
  arrivals: BookingRow[];
  departures: BookingRow[];
  stayingTonight: number;
};

export type StayTodayHighlight = "arrival" | "departure" | "turnover" | null;

export function summarizeGanttToday(
  bookings: BookingRow[],
  dayIsos: string[],
  today: string = todayIso()
): GanttTodaySummary {
  const active = bookings.filter((b) => b.status !== "anulata");

  return {
    todayIso: today,
    inView: dayIsos.includes(today),
    arrivals: active.filter((b) => b.check_in === today),
    departures: active.filter((b) => b.check_out === today),
    stayingTonight: active.filter((b) =>
      nightOccupied(today, b.check_in, b.check_out)
    ).length,
  };
}

export function roomTodayFlags(
  roomId: string,
  bookings: BookingRow[],
  today: string = todayIso()
): RoomTodayFlags {
  const relevant = bookings.filter(
    (b) => b.status !== "anulata" && b.room_ids.includes(roomId)
  );
  return {
    arrival: relevant.some((b) => b.check_in === today),
    departure: relevant.some((b) => b.check_out === today),
    occupiedTonight: relevant.some((b) =>
      nightOccupied(today, b.check_in, b.check_out)
    ),
  };
}

export function stayTodayHighlight(
  booking: BookingRow,
  today: string = todayIso()
): StayTodayHighlight {
  if (booking.status === "anulata") return null;
  const inDay = booking.check_in === today;
  const outDay = booking.check_out === today;
  if (inDay && outDay) return "turnover";
  if (inDay) return "arrival";
  if (outDay) return "departure";
  return null;
}
