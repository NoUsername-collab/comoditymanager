import { describe, expect, it } from "vitest";
import { buildSyntheticGanttBookingRow } from "@/services/bookings/synthetic-gantt-row";

describe("buildSyntheticGanttBookingRow", () => {
  it("puts the stay on every selected room", () => {
    const row = buildSyntheticGanttBookingRow({
      id: "b1",
      checkIn: "2026-09-10",
      checkOut: "2026-09-12",
      status: "cerere_noua",
      guestLastName: "Popescu",
      guestFirstName: "Ana",
      guestEmail: "ana@example.com",
      guestPhone: "0712345678",
      roomId: "r1",
      roomIds: ["r1", "r2"],
      roomNames: ["101", "102"],
      numAdults: 2,
    });

    expect(row.room_ids).toEqual(["r1", "r2"]);
    expect(row.room_names).toEqual(["101", "102"]);
    expect(row.num_adults).toBe(2);
  });
});
