import { describe, it, expect } from "vitest";
import {
  canSelectRoom,
  validateRoomSelection,
  suggestRoomCount,
  getSelectableRooms,
} from "../room-selection-guard";
import type { RoomSelectionState } from "../room-selection-guard";

describe("Room Selection Guard", () => {
  const mockRooms = [
    { id: "r1", name: "Room 101" },
    { id: "r2", name: "Room 102" },
    { id: "r3", name: "Room 103" },
    { id: "r4", name: "Room 104" },
  ];

  describe("canSelectRoom", () => {
    it("should allow deselecting a room", () => {
      const state: RoomSelectionState = {
        requiredRoomCount: 2,
        selectedRoomIds: ["r1", "r2"],
        availableRooms: mockRooms,
      };

      const result = canSelectRoom(state, "r1", true);

      expect(result.allowed).toBe(true);
      expect(result.selectedIds).toEqual(["r2"]);
    });

    it("should prevent selecting more rooms than required", () => {
      const state: RoomSelectionState = {
        requiredRoomCount: 2,
        selectedRoomIds: ["r1", "r2"],
        availableRooms: mockRooms,
      };

      const result = canSelectRoom(state, "r3", false);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Already selected 2");
      expect(result.selectedIds).toEqual(["r1", "r2"]);
    });

    it("should allow selecting room when under limit", () => {
      const state: RoomSelectionState = {
        requiredRoomCount: 2,
        selectedRoomIds: ["r1"],
        availableRooms: mockRooms,
      };

      const result = canSelectRoom(state, "r2", false);

      expect(result.allowed).toBe(true);
      expect(result.selectedIds).toEqual(["r1", "r2"]);
    });

    it("should handle single room requirement", () => {
      const state: RoomSelectionState = {
        requiredRoomCount: 1,
        selectedRoomIds: ["r1"],
        availableRooms: mockRooms,
      };

      const result = canSelectRoom(state, "r2", false);

      expect(result.allowed).toBe(false);
      expect(result.selectedIds).toEqual(["r1"]);
    });

    it("should handle many rooms requirement", () => {
      const state: RoomSelectionState = {
        requiredRoomCount: 4,
        selectedRoomIds: ["r1", "r2", "r3"],
        availableRooms: mockRooms,
      };

      const result = canSelectRoom(state, "r4", false);

      expect(result.allowed).toBe(true);
      expect(result.selectedIds).toEqual(["r1", "r2", "r3", "r4"]);
    });
  });

  describe("validateRoomSelection", () => {
    it("should pass when correct count selected", () => {
      const state: RoomSelectionState = {
        requiredRoomCount: 2,
        selectedRoomIds: ["r1", "r2"],
        availableRooms: mockRooms,
      };

      const result = validateRoomSelection(state);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should fail when too few rooms selected", () => {
      const state: RoomSelectionState = {
        requiredRoomCount: 2,
        selectedRoomIds: ["r1"],
        availableRooms: mockRooms,
      };

      const result = validateRoomSelection(state);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Need 2 room(s)");
    });

    it("should fail when too many rooms selected", () => {
      const state: RoomSelectionState = {
        requiredRoomCount: 2,
        selectedRoomIds: ["r1", "r2", "r3"],
        availableRooms: mockRooms,
      };

      const result = validateRoomSelection(state);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Selected too many");
    });

    it("should pass for single room when one selected", () => {
      const state: RoomSelectionState = {
        requiredRoomCount: 1,
        selectedRoomIds: ["r1"],
        availableRooms: mockRooms,
      };

      const result = validateRoomSelection(state);

      expect(result.valid).toBe(true);
    });

    it("should fail when no rooms selected", () => {
      const state: RoomSelectionState = {
        requiredRoomCount: 2,
        selectedRoomIds: [],
        availableRooms: mockRooms,
      };

      const result = validateRoomSelection(state);

      expect(result.valid).toBe(false);
    });
  });

  describe("suggestRoomCount", () => {
    it("should suggest selecting more rooms", () => {
      const message = suggestRoomCount(1, 3);
      expect(message).toContain("2 more");
    });

    it("should indicate completion", () => {
      const message = suggestRoomCount(2, 2);
      expect(message).toContain("All rooms selected");
    });

    it("should suggest removing extra rooms", () => {
      const message = suggestRoomCount(3, 2);
      expect(message).toContain("Remove 1");
    });
  });

  describe("getSelectableRooms", () => {
    it("should mark unselected rooms as selectable when under limit", () => {
      const state: RoomSelectionState = {
        requiredRoomCount: 2,
        selectedRoomIds: ["r1"],
        availableRooms: mockRooms,
      };

      const rooms = getSelectableRooms(state);

      const r1 = rooms.find((r) => r.id === "r1");
      const r2 = rooms.find((r) => r.id === "r2");

      expect(r1?.selectable).toBe(true); // Selected rooms always selectable
      expect(r2?.selectable).toBe(true); // Can add more
    });

    it("should mark unselected rooms as unselectable when at limit", () => {
      const state: RoomSelectionState = {
        requiredRoomCount: 2,
        selectedRoomIds: ["r1", "r2"],
        availableRooms: mockRooms,
      };

      const rooms = getSelectableRooms(state);

      const r3 = rooms.find((r) => r.id === "r3");
      const r4 = rooms.find((r) => r.id === "r4");

      expect(r3?.selectable).toBe(false);
      expect(r3?.reason).toContain("Need 2 rooms");
      expect(r4?.selectable).toBe(false);
    });

    it("should always allow deselection", () => {
      const state: RoomSelectionState = {
        requiredRoomCount: 1,
        selectedRoomIds: ["r1"],
        availableRooms: mockRooms,
      };

      const rooms = getSelectableRooms(state);
      const r1 = rooms.find((r) => r.id === "r1");

      expect(r1?.selectable).toBe(true);
    });
  });

  describe("Integration: Trying to book 2 rooms", () => {
    it("scenario: user tries to select 3 rooms for 2-room booking", () => {
      const state: RoomSelectionState = {
        requiredRoomCount: 2,
        selectedRoomIds: [],
        availableRooms: mockRooms,
      };

      // User clicks r1
      let result = canSelectRoom(state, "r1", false);
      expect(result.allowed).toBe(true);
      state.selectedRoomIds = result.selectedIds;

      // User clicks r2
      result = canSelectRoom(state, "r2", false);
      expect(result.allowed).toBe(true);
      state.selectedRoomIds = result.selectedIds;

      // User clicks r3 (should be BLOCKED)
      result = canSelectRoom(state, "r3", false);
      expect(result.allowed).toBe(false);
      expect(state.selectedRoomIds).toEqual(["r1", "r2"]);

      // Validation should pass
      const validation = validateRoomSelection(state);
      expect(validation.valid).toBe(true);
    });

    it("scenario: user selects 2, then deselects 1, then selects another", () => {
      const state: RoomSelectionState = {
        requiredRoomCount: 2,
        selectedRoomIds: ["r1", "r2"],
        availableRooms: mockRooms,
      };

      // User clicks r1 to deselect
      let result = canSelectRoom(state, "r1", true);
      expect(result.allowed).toBe(true);
      state.selectedRoomIds = result.selectedIds;
      expect(state.selectedRoomIds).toEqual(["r2"]);

      // User clicks r3 (should be allowed now)
      result = canSelectRoom(state, "r3", false);
      expect(result.allowed).toBe(true);
      state.selectedRoomIds = result.selectedIds;
      expect(state.selectedRoomIds).toEqual(["r2", "r3"]);

      // Validation should pass
      const validation = validateRoomSelection(state);
      expect(validation.valid).toBe(true);
    });
  });
});
