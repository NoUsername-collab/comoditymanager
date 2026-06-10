import { describe, expect, it } from "vitest";
import { sortRoomsLikeLocationStructure } from "@/domain/room/display-order";

describe("sortRoomsLikeLocationStructure", () => {
  it("orders by building, floor, sort_order like settings structure", () => {
    const buildings = [
      { id: "b-main", sort_order: 1 },
      { id: "b-annex", sort_order: 2 },
    ];
    const floors = [
      { id: "f-p", building_id: "b-main", sort_order: 1 },
      { id: "f-1", building_id: "b-main", sort_order: 2 },
    ];
    const rooms = sortRoomsLikeLocationStructure(
      [
        {
          id: "r4",
          building_id: "b-annex",
          floor_id: null,
          name: "A1",
          sort_order: 1,
        },
        {
          id: "r3",
          building_id: "b-main",
          floor_id: null,
          name: "Fara etaj",
          sort_order: 1,
        },
        {
          id: "r2",
          building_id: "b-main",
          floor_id: "f-1",
          name: "102",
          sort_order: 2,
        },
        {
          id: "r1",
          building_id: "b-main",
          floor_id: "f-p",
          name: "P01",
          sort_order: 1,
        },
      ],
      buildings,
      floors
    );

    expect(rooms.map((room) => room.id)).toEqual(["r1", "r2", "r3", "r4"]);
  });
});
