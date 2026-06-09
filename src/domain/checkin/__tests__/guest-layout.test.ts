import { describe, test, expect } from "vitest";
import {
  buildCheckinGuestSlots,
  buildCheckinGuestSlotsForRooms,
  effectiveIdentityScope,
  expandGuestsForPersistence,
  groupGuestsByRoom,
  guestsCollectingIdentity,
  guestsReceivingRooms,
  guestsToPersist,
} from "../guest-layout";
import type { BookingForCheckin } from "../types";

const booking: BookingForCheckin = {
  id: "b1",
  status: "confirmata",
  total_price: 400,
  check_in: "2026-06-09",
  check_out: "2026-06-11",
  guest_name: "Popescu Ion",
  guest_last_name: "Popescu",
  guest_first_name: "Ion",
  guest_phone: "0712345678",
  guest_email: "ion@test.ro",
  num_adults: 4,
  num_children: 0,
  room_names: ["Camera 1", "Camera 2"],
};

describe("effectiveIdentityScope", () => {
  test("both lets operator choose, default rep", () => {
    expect(effectiveIdentityScope("both", null)).toBe("rep");
    expect(effectiveIdentityScope("both", "individual")).toBe("individual");
  });

  test("fixed owner modes", () => {
    expect(effectiveIdentityScope("per_room", null)).toBe("per_room");
    expect(effectiveIdentityScope("individual", null)).toBe("individual");
  });
});

describe("buildCheckinGuestSlots", () => {
  test("rep — single titular", () => {
    const slots = buildCheckinGuestSlots(booking, "rep");
    expect(slots).toHaveLength(1);
    expect(slots[0].is_representative).toBe(true);
    expect(slots[0].room_label).toBe("Camera 1");
    expect(slots[0].last_name).toBe("Popescu");
  });

  test("per_room — one slot per camera", () => {
    const slots = buildCheckinGuestSlots(booking, "per_room");
    expect(slots).toHaveLength(2);
    expect(slots[0].room_label).toBe("Camera 1");
    expect(slots[1].room_label).toBe("Camera 2");
    expect(slots[0].is_representative).toBe(true);
    expect(slots[1].is_representative).toBe(false);
  });

  test("individual — câte un slot per adult, camere rotative", () => {
    const slots = buildCheckinGuestSlots(booking, "individual");
    expect(slots).toHaveLength(4);
    expect(slots.map((s) => s.room_label)).toEqual([
      "Camera 1",
      "Camera 2",
      "Camera 1",
      "Camera 2",
    ]);
  });
});

describe("groupGuestsByRoom", () => {
  test("groups by room_label preserving order", () => {
    const guests = buildCheckinGuestSlots(booking, "individual");
    const groups = groupGuestsByRoom(guests);
    expect(groups).toHaveLength(2);
    expect(groups[0].room).toBe("Camera 1");
    expect(groups[0].guests).toHaveLength(2);
  });
});

describe("guestsCollectingIdentity", () => {
  test("skips guests marked absent", () => {
    const guests = buildCheckinGuestSlots(booking, "individual");
    guests[2].present_at_checkin = false;
    expect(guestsCollectingIdentity(guests)).toHaveLength(3);
    expect(guestsToPersist(guests)).toHaveLength(1);
  });

  test("keys_only rooms persist without identity", () => {
    const guests = buildCheckinGuestSlotsForRooms(
      booking,
      ["Camera 1", "Camera 2"],
      "per_room",
    );
    expect(guests[1].keys_only).toBe(true);
    expect(guestsCollectingIdentity(guests)).toHaveLength(1);
    expect(guestsReceivingRooms(guests)).toHaveLength(2);
    expect(guestsToPersist(guests)).toHaveLength(2);
  });
});

describe("buildCheckinGuestSlotsForRooms", () => {
  test("rep — one form for all selected rooms", () => {
    const slots = buildCheckinGuestSlotsForRooms(booking, ["7", "1"], "rep");
    expect(slots).toHaveLength(1);
    expect(slots[0].is_representative).toBe(true);
  });

  test("expandGuestsForPersistence duplicates rep across rooms", () => {
    const rep = buildCheckinGuestSlotsForRooms(booking, ["7"], "rep")[0];
    const expanded = expandGuestsForPersistence(
      [rep],
      "rep",
      ["7", "1", "10"],
    );
    expect(expanded).toHaveLength(3);
    expect(expanded.map((g) => g.room_label)).toEqual(["7", "1", "10"]);
  });
});
