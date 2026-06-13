import { parseIso, stayNightDates } from "@/lib/stay-dates";
import type {
  PricingSeason,
  StayPricingRules,
  WeekendPricingMode,
} from "@/domain/settings/booking-rules";

export type RoomNightPrice = {
  price_per_night: number;
};

export type NightlyRateLine = {
  date: string;
  base_rate: number;
  applied_rate: number;
  weekend_applied: boolean;
  season_name: string | null;
};

export type RoomStayPricingLine = {
  room_id?: string;
  room_name?: string;
  building_name?: string;
  base_price_per_night: number;
  nights: NightlyRateLine[];
  line_total: number;
};

export function isWeekendNight(
  dateIso: string,
  mode: WeekendPricingMode
): boolean {
  const day = parseIso(dateIso).getDay();
  if (mode === "sat_only") return day === 6;
  return day === 5 || day === 6;
}

function monthDayKey(month: number, day: number): number {
  return month * 100 + day;
}

function dateInSeasonRange(
  month: number,
  day: number,
  season: PricingSeason
): boolean {
  const cur = monthDayKey(month, day);
  const start = monthDayKey(season.startMonth, season.startDay);
  const end = monthDayKey(season.endMonth, season.endDay);
  if (start <= end) return cur >= start && cur <= end;
  return cur >= start || cur <= end;
}

export function matchingSeasonForNight(
  dateIso: string,
  seasons: PricingSeason[]
): PricingSeason | null {
  const d = parseIso(dateIso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  let best: PricingSeason | null = null;
  for (const season of seasons) {
    if (!dateInSeasonRange(month, day, season)) continue;
    if (!best || season.multiplier > best.multiplier) {
      best = season;
    }
  }
  return best;
}

export function seasonMultiplierForNight(
  dateIso: string,
  seasons: PricingSeason[]
): number {
  const match = matchingSeasonForNight(dateIso, seasons);
  return match?.multiplier ?? 1;
}

export function resolveNightlyRate(
  basePrice: number,
  dateIso: string,
  rules: StayPricingRules | null | undefined
): NightlyRateLine {
  const base = Math.max(0, basePrice);
  if (!rules) {
    return {
      date: dateIso,
      base_rate: base,
      applied_rate: base,
      weekend_applied: false,
      season_name: null,
    };
  }

  let multiplier = 1;
  let weekendApplied = false;
  if (rules.weekendEnabled && isWeekendNight(dateIso, rules.weekendMode)) {
    multiplier *= rules.weekendMultiplier;
    weekendApplied = true;
  }

  const season = matchingSeasonForNight(dateIso, rules.seasons);
  if (season) {
    multiplier *= season.multiplier;
  }

  const applied = Math.round(base * multiplier * 100) / 100;
  return {
    date: dateIso,
    base_rate: base,
    applied_rate: applied,
    weekend_applied: weekendApplied,
    season_name: season?.name ?? null,
  };
}

export function computeRoomStayPricing(
  room: RoomNightPrice & {
    room_id?: string;
    room_name?: string;
    building_name?: string;
  },
  checkIn: string,
  checkOut: string,
  rules?: StayPricingRules | null
): RoomStayPricingLine {
  const nights = stayNightDates(checkIn, checkOut).map((date) =>
    resolveNightlyRate(room.price_per_night, date, rules)
  );
  const line_total =
    Math.round(nights.reduce((sum, n) => sum + n.applied_rate, 0) * 100) / 100;
  return {
    room_id: room.room_id,
    room_name: room.room_name,
    building_name: room.building_name,
    base_price_per_night: room.price_per_night,
    nights,
    line_total,
  };
}

export function computeStandardStayTotal(
  rooms: RoomNightPrice[],
  checkIn: string,
  checkOut: string,
  rules?: StayPricingRules | null
): number {
  const total = rooms.reduce(
    (sum, room) =>
      sum + computeRoomStayPricing(room, checkIn, checkOut, rules).line_total,
    0
  );
  return Math.round(total * 100) / 100;
}
