import { nightOccupied, todayIso } from "@/lib/stay-dates";
import type { BookingRow } from "@/domain/booking/row";

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

/** Zile cu plecare + sosire în aceeași cameră (turnover). */
export function roomTurnoverDays(
  roomId: string,
  bookings: BookingRow[],
  dayIsos: string[]
): Set<string> {
  return roomsTurnoverDays(bookings, dayIsos).get(roomId) ?? new Set();
}

/** Precompute turnover days per room — O(bookings × days), once per Gantt render. */
export function roomsTurnoverDays(
  bookings: BookingRow[],
  dayIsos: string[]
): Map<string, Set<string>> {
  const byRoom = new Map<string, BookingRow[]>();
  for (const booking of bookings) {
    if (booking.status === "anulata") continue;
    for (const roomId of booking.room_ids) {
      const list = byRoom.get(roomId);
      if (list) list.push(booking);
      else byRoom.set(roomId, [booking]);
    }
  }

  const out = new Map<string, Set<string>>();
  for (const [roomId, relevant] of byRoom) {
    const turnover = new Set<string>();
    for (const iso of dayIsos) {
      const hasArrival = relevant.some((b) => b.check_in === iso);
      const hasDeparture = relevant.some((b) => b.check_out === iso);
      if (hasArrival && hasDeparture) turnover.add(iso);
    }
    if (turnover.size > 0) out.set(roomId, turnover);
  }
  return out;
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
