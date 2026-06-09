import { describe, expect, test } from "vitest";
import {
  canOfferOperativeCheckIn,
  canOfferOperativeCheckInFromBooking,
  filterBookingsForOperativeCheckIn,
  isOperativeCheckInTimestampValid,
  isStayCheckedIn,
  operativeCheckInDatetimeBounds,
} from "../operative-checkin";

describe("operative-checkin", () => {
  test("canOfferOperativeCheckIn only on arrival day", () => {
    expect(
      canOfferOperativeCheckIn({
        status: "confirmata",
        plannedCheckIn: "2026-06-10",
        today: "2026-06-10",
      })
    ).toBe(true);

    expect(
      canOfferOperativeCheckIn({
        status: "confirmata",
        plannedCheckIn: "2026-06-11",
        today: "2026-06-10",
      })
    ).toBe(false);
  });

  test("isStayCheckedIn with wizard record or timestamp", () => {
    expect(isStayCheckedIn({ actualCheckInAt: null, hasCheckinRecord: true })).toBe(
      true,
    );
    expect(isStayCheckedIn({ actualCheckInAt: "2026-06-10T14:00:00" })).toBe(
      true,
    );
    expect(isStayCheckedIn({})).toBe(false);
  });

  test("rejects when wizard checkin exists without booking timestamp", () => {
    expect(
      canOfferOperativeCheckIn({
        status: "confirmata",
        plannedCheckIn: "2026-06-10",
        today: "2026-06-10",
        hasCheckinRecord: true,
        roomNames: ["Camera 1"],
        checkedInRooms: ["Camera 1"],
      }),
    ).toBe(false);
  });

  test("allows continuing room check-in when some rooms remain", () => {
    expect(
      canOfferOperativeCheckIn({
        status: "confirmata",
        plannedCheckIn: "2026-06-10",
        today: "2026-06-10",
        actualCheckInAt: "2026-06-10T14:00:00",
        hasCheckinRecord: true,
        roomNames: ["Camera 1", "Camera 2"],
        checkedInRooms: ["Camera 1"],
      }),
    ).toBe(true);
  });

  test("allows completing wizard on arrival day when only operative time exists", () => {
    expect(
      canOfferOperativeCheckIn({
        status: "confirmata",
        plannedCheckIn: "2026-06-10",
        today: "2026-06-10",
        actualCheckInAt: "2026-06-10T14:00:00",
        hasCheckinRecord: false,
      }),
    ).toBe(true);
  });

  test("rejects wizard on non-arrival day even with operative time only", () => {
    expect(
      canOfferOperativeCheckIn({
        status: "confirmata",
        plannedCheckIn: "2026-06-11",
        today: "2026-06-10",
        actualCheckInAt: "2026-06-10T14:00:00",
        hasCheckinRecord: false,
      }),
    ).toBe(false);
  });

  test("rejects cerere and already checked in", () => {
    expect(
      canOfferOperativeCheckIn({
        status: "cerere_noua",
        plannedCheckIn: "2026-06-10",
        today: "2026-06-10",
      })
    ).toBe(false);

    expect(
      canOfferOperativeCheckIn({
        status: "confirmata",
        plannedCheckIn: "2026-06-10",
        today: "2026-06-10",
        actualCheckInAt: "2026-06-10T14:00:00",
        hasCheckinRecord: true,
        roomNames: ["Camera 1"],
        checkedInRooms: ["Camera 1"],
      })
    ).toBe(false);
  });

  test("filterBookingsForOperativeCheckIn", () => {
    const rows = filterBookingsForOperativeCheckIn(
      [
        {
          id: "a",
          status: "confirmata",
          check_in: "2026-06-10",
          guest_name: "B",
        },
        {
          id: "b",
          status: "confirmata",
          check_in: "2026-06-11",
          guest_name: "A",
        },
        {
          id: "c",
          status: "cerere_noua",
          check_in: "2026-06-10",
          guest_name: "C",
        },
      ] as Array<{
        id: string;
        status: string;
        check_in: string;
        guest_name: string;
      }>,
      "2026-06-10"
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("a");
  });

  test("isOperativeCheckInTimestampValid matches planned day", () => {
    expect(
      isOperativeCheckInTimestampValid("2026-06-10", "2026-06-10T15:30")
    ).toBe(true);
    expect(
      isOperativeCheckInTimestampValid("2026-06-10", "2026-06-11T08:00")
    ).toBe(false);
  });

  test("operativeCheckInDatetimeBounds", () => {
    expect(operativeCheckInDatetimeBounds("2026-06-10")).toEqual({
      min: "2026-06-10T00:00",
      max: "2026-06-10T23:59",
    });
  });

  test("canOfferOperativeCheckInFromBooking", () => {
    expect(
      canOfferOperativeCheckInFromBooking(
        {
          status: "confirmata",
          check_in: "2026-06-10",
        },
        "2026-06-10"
      )
    ).toBe(true);
  });
});
