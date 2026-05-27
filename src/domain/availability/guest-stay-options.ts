import { isAtLeastOneNight } from "@/domain/booking/conflict";
import { isRoomFreeForStay } from "@/domain/availability/rooms-free";
import { minRoomsToHostGuests } from "@/domain/availability/stay-capacity";
import { stayNightCount } from "@/lib/stay-dates";

export type GuestOptionRoom = {
  id: string;
  name: string;
  building_name: string;
  has_ac: boolean;
  capacity_max: number;
  price_per_night: number;
};

export type GuestStayOption = {
  option_id: string;
  kind: "single" | "combo";
  rooms: GuestOptionRoom[];
  nights: number;
  price_per_night: number;
  total_estimate_ron: number;
  title: string;
  subtitle: string;
};

export type GuestStayPreview = {
  check_in: string;
  check_out: string;
  guest_count: number;
  nights: number;
  free_room_count: number;
  can_host: boolean;
  options: GuestStayOption[];
  message?: string;
};

type RoomInput = GuestOptionRoom;

function optionId(roomIds: string[]): string {
  return [...roomIds].sort().join(",");
}

function totalPerNight(rooms: RoomInput[]): number {
  return rooms.reduce((s, r) => s + r.price_per_night, 0);
}

function buildOption(
  rooms: RoomInput[],
  nights: number,
  kind: "single" | "combo",
  title: string,
  subtitle: string
): GuestStayOption {
  const ppn = totalPerNight(rooms);
  return {
    option_id: optionId(rooms.map((r) => r.id)),
    kind,
    rooms,
    nights,
    price_per_night: ppn,
    total_estimate_ron: Math.round(ppn * nights),
    title,
    subtitle,
  };
}

/** Alege camere până acoperă numărul de oaspeți. */
function greedyCoverGuests(
  rooms: RoomInput[],
  guestCount: number,
  sort: "capacity" | "price"
): RoomInput[] | null {
  const sorted = [...rooms].sort((a, b) => {
    if (sort === "capacity") {
      return b.capacity_max - a.capacity_max;
    }
    return a.price_per_night - b.price_per_night;
  });

  const picked: RoomInput[] = [];
  let cap = 0;
  for (const r of sorted) {
    if (cap >= guestCount) break;
    picked.push(r);
    cap += r.capacity_max;
  }
  return cap >= guestCount ? picked : null;
}

export function computeGuestStayOptions(
  allRooms: RoomInput[],
  occupied: { room_id: string; check_in: string; check_out: string }[],
  checkIn: string,
  checkOut: string,
  guestCount: number,
  times: { checkIn: string; checkOut: string }
): GuestStayPreview {
  if (!isAtLeastOneNight(checkIn, checkOut) || guestCount < 1) {
    return {
      check_in: checkIn,
      check_out: checkOut,
      guest_count: guestCount,
      nights: 0,
      free_room_count: 0,
      can_host: false,
      options: [],
      message: "Choose valid dates and at least one guest.",
    };
  }

  const nights = stayNightCount(checkIn, checkOut);
  const freeRooms = allRooms.filter((r) =>
    isRoomFreeForStay(r.id, checkIn, checkOut, occupied, times.checkIn, times.checkOut)
  );

  const { possible, minRooms } = minRoomsToHostGuests(
    guestCount,
    freeRooms.map((r) => ({
      capacity_base: r.capacity_max,
      allows_extra_beds: false,
      max_extra_beds_per_room: 0,
    }))
  );

  if (freeRooms.length === 0) {
    return {
      check_in: checkIn,
      check_out: checkOut,
      guest_count: guestCount,
      nights,
      free_room_count: 0,
      can_host: false,
      options: [],
      message: "No free rooms for selected period. Try different dates.",
    };
  }

  if (!possible) {
    return {
      check_in: checkIn,
      check_out: checkOut,
      guest_count: guestCount,
      nights,
      free_room_count: freeRooms.length,
      can_host: false,
      options: [],
      message: `Insufficient capacity for ${guestCount} guests in selected period.`,
    };
  }

  const seen = new Set<string>();
  const options: GuestStayOption[] = [];

  const singles = freeRooms
    .filter((r) => r.capacity_max >= guestCount)
    .sort((a, b) => a.price_per_night - b.price_per_night);

  for (const r of singles.slice(0, 3)) {
    const id = optionId([r.id]);
    if (seen.has(id)) continue;
    seen.add(id);
    options.push(
      buildOption(
        [r],
        nights,
        "single",
        `${r.name}`,
        `${r.building_name ?? "Guesthouse"} · up to ${r.capacity_max} guests · ${r.has_ac ? "AC" : "No AC"}`
      )
    );
  }

  const comboBest = greedyCoverGuests(freeRooms, guestCount, "capacity");
  if (comboBest && comboBest.length > 1) {
    const id = optionId(comboBest.map((r) => r.id));
    if (!seen.has(id)) {
      seen.add(id);
      const names = comboBest.map((r) => r.name).join(", ");
      options.push(
        buildOption(
          comboBest,
          nights,
          "combo",
          `${comboBest.length} camere`,
          `${names} · at least ${minRooms} rooms for your group`
        )
      );
    }
  }

  const comboCheap = greedyCoverGuests(freeRooms, guestCount, "price");
  if (comboCheap) {
    const id = optionId(comboCheap.map((r) => r.id));
    if (!seen.has(id)) {
      seen.add(id);
      const names = comboCheap.map((r) => r.name).join(", ");
      options.push(
        buildOption(
          comboCheap,
          nights,
          "combo",
          comboCheap.length === 1 ? comboCheap[0].name : `${comboCheap.length} rooms (economy)`,
          `${names} · lower price option`
        )
      );
    }
  }

  if (options.length === 0 && comboBest) {
    const id = optionId(comboBest.map((r) => r.id));
    seen.add(id);
    options.push(
      buildOption(
        comboBest,
        nights,
        comboBest.length > 1 ? "combo" : "single",
        comboBest.length > 1 ? `${comboBest.length} rooms` : comboBest[0].name,
        "Available option for selected period"
      )
    );
  }

  return {
    check_in: checkIn,
    check_out: checkOut,
    guest_count: guestCount,
    nights,
    free_room_count: freeRooms.length,
    can_host: options.length > 0,
    options: options.slice(0, 5),
    message:
      options.length === 0
        ? "Could not generate an option. Contact the guesthouse."
        : undefined,
  };
}
