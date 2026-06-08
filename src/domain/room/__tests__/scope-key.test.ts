import { describe, expect, it } from "vitest";
import { roomScopeKey } from "@/domain/room/scope-key";

describe("roomScopeKey", () => {
  it("separates floors within the same building", () => {
    expect(roomScopeKey("b1", "f1")).not.toBe(roomScopeKey("b1", "f2"));
  });

  it("treats missing floor as empty scope", () => {
    expect(roomScopeKey("b1", null)).toBe("b1::");
    expect(roomScopeKey("b1", undefined)).toBe("b1::");
    expect(roomScopeKey("b1", "")).toBe("b1::");
  });
});
