import { stayNightCount } from "@/lib/stay-dates";

export type RoomNightPrice = {
  price_per_night: number;
};

export function computeStandardStayTotal(
  rooms: RoomNightPrice[],
  checkIn: string,
  checkOut: string
): number {
  const nights = stayNightCount(checkIn, checkOut);
  const raw = rooms.reduce((s, r) => s + r.price_per_night * nights, 0);
  return Math.round(raw * 100) / 100;
}
