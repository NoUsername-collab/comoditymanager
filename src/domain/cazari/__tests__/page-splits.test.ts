import { describe, expect, it } from "vitest";
import {
  filterCazariListsByQuery,
  splitOperationalStays,
} from "@/domain/cazari/page-splits";

const baseStay = {
  check_in: "2026-06-10",
  check_out: "2026-06-12",
  guest_name: "Ion Pop",
};

describe("page-splits", () => {
  it("filters stays by guest name query", () => {
    const result = filterCazariListsByQuery(
      {
        stays: [
          {
            ...baseStay,
            id: "1",
            status: "cerere_noua",
            guest_first_name: "Ion",
            guest_last_name: "Pop",
            guest_phone: null,
            guest_email: null,
            room_names: [],
          },
          {
            ...baseStay,
            id: "2",
            guest_name: "Maria",
            guest_first_name: "Maria",
            guest_last_name: "Ion",
            status: "confirmata",
            guest_phone: null,
            guest_email: null,
            room_names: [],
          },
        ] as unknown as Parameters<typeof filterCazariListsByQuery>[0]["stays"],
        history: [],
        confirmedRecentHistory: [],
        cancelledHistory: [],
      },
      "maria"
    );

    expect(result.filteredStays).toHaveLength(1);
    expect(result.filteredStays[0]?.guest_name).toBe("Maria");
  });

  it("splits operational stays into cereri and visible confirmate", () => {
    const result = splitOperationalStays(
      [
        { ...baseStay, status: "cerere_noua" },
        {
          ...baseStay,
          status: "confirmata",
          check_in: "2026-06-15",
          check_out: "2026-06-18",
        },
        {
          ...baseStay,
          status: "confirmata",
          check_in: "2027-01-01",
          check_out: "2027-01-05",
        },
      ],
      "2026-06-09",
      "2026-07-09"
    );

    expect(result.cereri).toHaveLength(1);
    expect(result.confirmate).toHaveLength(2);
    expect(result.confirmateVisible).toHaveLength(1);
    expect(result.hiddenConfirmateCount).toBe(1);
  });
});
