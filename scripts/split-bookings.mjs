import fs from "fs";
import path from "path";

const src = fs.readFileSync("src/services/bookings.ts", "utf8");
const dir = "src/services/bookings";
fs.mkdirSync(dir, { recursive: true });

function slice(startMarker, endMarker) {
  const s = src.indexOf(startMarker);
  if (s < 0) throw new Error("start not found: " + startMarker);
  const e = endMarker ? src.indexOf(endMarker, s) : src.length;
  return src.slice(s, e);
}

const sharedImports = `import { unstable_cache } from "next/cache";
import type { GuestFlagLevel } from "@/domain/guest/types";
import { createAdminClient, createPublicAdminClient } from "@/lib/supabase/admin";
import { isSimActive } from "@/domain/simulation/sim-cookie";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { isAtLeastOneNight } from "@/domain/booking/conflict";
import type { BookingStatus } from "@/domain/booking/types";
import { addDays, parseIso } from "@/lib/stay-dates";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";
import {
  logAdminActivity,
  logAdminActivityFromSession,
} from "@/services/activity-log";
import {
  bookingHasSplitSegments,
  shiftAllSegmentsByDays,
  syncBookingRoomSegments,
} from "@/services/booking-segments";
import {
  assertValidGuestPhone,
  isValidGuestPhone,
  normalizePhone,
} from "@/domain/guest/normalize";
import { resolveGuestForBooking } from "@/services/guest-booking-resolve";
import {
  listGuestProfileSummaries,
  resolveGuestAlertSnapshot,
} from "@/services/guest-profiles";
import {
  assertRoomsAvailableForOccupancy,
} from "@/services/room-occupancy";
import { getAdminUser } from "@/lib/auth/require-admin";
import { getTenantScope, withTenantId } from "@/lib/tenant/scope";
import { parseOperationalTimestamp } from "@/lib/operational-check";
`;

const typesBody = slice(
  "const BOOKING_ROW_SELECT",
  "export async function listBookingsForRange"
);
const mapBody = slice(
  "function mapBookingRows",
  "export async function listBookingsForRange"
).replace(/^function mapBookingRows/, "export function mapBookingRows");
const queriesBody =
  slice(
    "export async function listBookingsForRange",
    "export async function assertRoomsAvailableForStay"
  ) +
  slice("export type BookingDetail", "export async function confirmBookingWithRooms");
const availBody = slice(
  "export async function assertRoomsAvailableForStay",
  "export async function assignBookingRoomHold"
);
const createBody = slice(
  "export async function assignBookingRoomHold",
  "export type BookingDetail"
);
const lifecycleBody = slice(
  "export async function confirmBookingWithRooms",
  "async function requireConfirmedBooking"
);
const opsBody = slice("async function requireConfirmedBooking", null);

fs.writeFileSync(
  path.join(dir, "types.ts"),
  `import type {
  GuestBookingFlagSummary,
  GuestFlagLevel,
} from "@/domain/guest/types";
import type { BookingStatus } from "@/domain/booking/types";

${typesBody}`
);

fs.writeFileSync(
  path.join(dir, "map.ts"),
  `import { listGuestProfileSummaries } from "@/services/guest-profiles";
import type { BookingRow, BookingSelectRow } from "./types";

${mapBody}`
);

fs.writeFileSync(
  path.join(dir, "queries.ts"),
  `${sharedImports}
import {
  BOOKING_ROW_SELECT,
  BOOKING_ROW_WITH_UPDATED_SELECT,
  type BookingRow,
  type BookingSelectRow,
  type BookingDetail,
  type OperationalStayRow,
  type CompletedStayHistoryRow,
  type CancelledStayHistoryRow,
} from "./types";
import { mapBookingRows, attachGuestProfiles } from "./map";

${queriesBody}`
);

fs.writeFileSync(
  path.join(dir, "availability.ts"),
  `import { assertRoomsAvailableForOccupancy } from "@/services/room-occupancy";

${availBody}`
);

fs.writeFileSync(
  path.join(dir, "create.ts"),
  `${sharedImports}
import { getBookingById } from "./queries";
import { assertRoomsAvailableForStay } from "./availability";

${createBody}`
);

fs.writeFileSync(
  path.join(dir, "lifecycle.ts"),
  `${sharedImports}
import { getBookingById } from "./queries";
import { createBookingRequest } from "./create";

${lifecycleBody}`
);

fs.writeFileSync(path.join(dir, "operations.ts"), `${sharedImports}
import { getBookingById } from "./queries";

${opsBody}`);

fs.writeFileSync(
  path.join(dir, "index.ts"),
  `export { listOccupiedRoomRanges } from "@/services/room-occupancy";
export * from "./types";
export * from "./map";
export * from "./queries";
export * from "./availability";
export * from "./create";
export * from "./lifecycle";
export * from "./operations";
`
);

fs.writeFileSync("src/services/bookings.ts", 'export * from "./bookings/index";\n');

console.log("bookings split OK");
