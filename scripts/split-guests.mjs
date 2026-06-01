import fs from "fs";
import path from "path";

const src = fs.readFileSync("src/services/guests.ts.bak", "utf8");
const dir = "src/services/guests";
fs.mkdirSync(dir, { recursive: true });

function slice(startMarker, endMarker) {
  const s = src.indexOf(startMarker);
  if (s < 0) throw new Error("start not found: " + startMarker);
  const e = endMarker ? src.indexOf(endMarker, s) : src.length;
  if (e < 0) throw new Error("end not found after start: " + endMarker);
  return src.slice(s, e);
}

const sharedImports = `import { formatGuestFullName } from "@/domain/guest-name";
import {
  shiftStayDatesByYears,
  shiftStayToNextFutureYear,
} from "@/domain/guest/rebook-dates";
import {
  assertValidGuestPhone,
  normalizeEmail,
  normalizePhone,
} from "@/domain/guest/normalize";
import { parseGuestTags } from "@/domain/guest/tags";
import type {
  GuestDocType,
  GuestHighlights,
  GuestBookingInput,
  GuestIdentityStatus,
  GuestListItem,
  GuestNationalIdType,
  GuestRow,
  GuestSearchFilter,
  GuestSearchResult,
  GuestSex,
  GuestStayReviewRow,
  GuestTag,
} from "@/domain/guest/types";
import { GUEST_MATCH_PRIORITY } from "@/domain/guest/matching-contract";
import type { BookingStatus } from "@/domain/booking/types";
import type { BookingRoomSegmentRow } from "@/domain/booking/segment-types";
import { stayNightCount } from "@/lib/stay-dates";
import { getTenantScope, withTenantId } from "@/lib/tenant/scope";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { mapGuestRow } from "@/domain/guest/map-row";
import {
  ensureGuestProfiles,
  getGuestProfile,
  listGuestProfileSummaries,
  listGuestStayReviewsByBookingIds,
  mergeGuestProfiles,
} from "@/services/guest-profiles";
`;

const lookupImports = `${sharedImports}
import { isPlaceholderEmail } from "@/domain/guest/normalize";
`;

const lookupBody =
  slice("export async function getGuestBaseById", "async function findGuestByPhone") +
  slice("async function findGuestByIdsOrdered", "export async function findGuestAutofillMatch") +
  slice("export type GuestAutofillMatch", "/** Matching priority") +
  slice("export async function findGuestAutofillMatch", "type GuestListSelectRow") +
  slice("export async function findGuestByNationalId", "export async function updateGuestPhone");

fs.writeFileSync(path.join(dir, "lookup.ts"), lookupImports + "\n" + lookupBody);

fs.writeFileSync(
  path.join(dir, "search.ts"),
  `${sharedImports}
import { isPlaceholderEmail } from "@/domain/guest/normalize";
import { getGuestBaseById } from "./lookup";

` + slice("type GuestListSelectRow", "async function listSegmentsForBookings")
);

fs.writeFileSync(
  path.join(dir, "history.ts"),
  `${sharedImports}

` +
    slice("async function listSegmentsForBookings", "export type GuestIdentityInput")
);

fs.writeFileSync(
  path.join(dir, "profile.ts"),
  `${sharedImports}
import { getGuestBaseById } from "./lookup";

` +
    slice("export type GuestIdentityInput", "export async function findGuestByNationalId") +
    slice("export async function updateGuestPhone", "export async function mergeGuests")
);

fs.writeFileSync(
  path.join(dir, "merge.ts"),
  `${sharedImports}
import { getGuestBaseById } from "./lookup";

` + slice("export async function mergeGuests", "async function estimateTotalForRooms")
);

let rebookBody = slice(
  "async function estimateTotalForRooms",
  "export async function findDuplicateGuestsForGuest"
);
if (!rebookBody.includes('import("@/services/bookings")')) {
  rebookBody = rebookBody.replace(
    "if (!data) return null;\n  return getBookingById(data.id);",
    `if (!data) return null;
  const { getBookingById } = await import("@/services/bookings");
  return getBookingById(data.id);`
  );
}
rebookBody = rebookBody.replace(
  "return getBookingById(data.id);",
  `const { getBookingById } = await import("@/services/bookings");
  return getBookingById(data.id);`
);
// dedupe double import in getLastGuestBooking
rebookBody = rebookBody.replace(
  /const \{ getBookingById \} = await import\("@\/services\/bookings"\);\s*const \{ getBookingById \} = await import\("@\/services\/bookings"\);/,
  'const { getBookingById } = await import("@/services/bookings");'
);
rebookBody = rebookBody.replace(
  /const \{ createBookingRequest \} = await import\("@\/services\/bookings"\);\s*/g,
  ""
);
rebookBody = rebookBody.replace(
  /const total = await estimateTotalForRooms\([\s\S]*?\);\s*\n\s*const bookingId = await createBookingRequest\(/g,
  (m) =>
    m.replace(
      "const bookingId = await createBookingRequest(",
      'const { createBookingRequest } = await import("@/services/bookings");\n  const bookingId = await createBookingRequest('
    )
);

fs.writeFileSync(
  path.join(dir, "rebook.ts"),
  `${sharedImports}
import { getGuestBaseById } from "./lookup";
import { assertRoomsAvailableForStay } from "@/services/bookings/availability";

${rebookBody}`
);

fs.writeFileSync(
  path.join(dir, "duplicates.ts"),
  `${sharedImports}
import { getGuestBaseById } from "./lookup";

` +
    slice(
      "export async function findDuplicateGuestsForGuest",
      "export function guestInputFromNames"
    )
);

fs.writeFileSync(path.join(dir, "input.ts"), `${sharedImports}

` + slice("export function guestInputFromNames", null));

fs.writeFileSync(
  path.join(dir, "index.ts"),
  `export type { ResolveGuestResult } from "@/services/guest-booking-resolve";
export { resolveGuestForBooking } from "@/services/guest-booking-resolve";
export * from "./lookup";
export * from "./search";
export * from "./history";
export * from "./profile";
export * from "./merge";
export * from "./rebook";
export * from "./duplicates";
export * from "./input";
`
);

fs.writeFileSync("src/services/guests.ts", 'export * from "./guests/index";\n');
console.log("guests split OK, lookup lines:", fs.readFileSync(path.join(dir, "lookup.ts"), "utf8").split("\n").length);
