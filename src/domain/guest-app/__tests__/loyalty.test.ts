import { describe, expect, it } from "vitest";
import {
  formatLoyaltyReference,
  guestLoyaltyHref,
  isLoyaltyReferenceFormat,
  loyaltyNightsRemaining,
  loyaltyPerkUnlocked,
  mapGuestLoyaltyProgram,
  normalizeLoyaltyReference,
} from "../loyalty";

describe("loyalty reference", () => {
  it("normalizes dashes, case, and Crockford lookalikes", () => {
    expect(normalizeLoyaltyReference("k7m2-q9xw")).toBe("K7M2Q9XW");
    expect(normalizeLoyaltyReference("  ilou-1234  ")).toBe("110V1234");
  });

  it("formats an 8-character code for display", () => {
    expect(formatLoyaltyReference("k7m2q9xw")).toBe("K7M2-Q9XW");
  });

  it("rejects short or invalid alphabet", () => {
    expect(isLoyaltyReferenceFormat("ABC")).toBe(false);
    expect(isLoyaltyReferenceFormat("K7M2-Q9XW")).toBe(true);
  });

  it("builds a guest card URL from the display reference", () => {
    expect(guestLoyaltyHref("k7m2q9xw")).toBe("/guest/K7M2-Q9XW");
  });
});

describe("loyalty perk progress", () => {
  it("does not unlock when the property has no night threshold", () => {
    expect(loyaltyPerkUnlocked(12, 0)).toBe(false);
    expect(loyaltyNightsRemaining(12, 0)).toBe(0);
  });

  it("unlocks at the night threshold", () => {
    expect(loyaltyPerkUnlocked(4, 5)).toBe(false);
    expect(loyaltyPerkUnlocked(5, 5)).toBe(true);
    expect(loyaltyNightsRemaining(3, 5)).toBe(2);
    expect(loyaltyNightsRemaining(9, 5)).toBe(0);
  });
});

describe("mapGuestLoyaltyProgram", () => {
  it("defaults when jsonb is missing", () => {
    expect(mapGuestLoyaltyProgram(null).enabled).toBe(false);
    expect(mapGuestLoyaltyProgram({}).enabled).toBe(false);
  });

  it("reads an opt-in program", () => {
    const program = mapGuestLoyaltyProgram({
      enabled: true,
      nightsForPerk: 7,
      perkTitle: "Breakfast",
      perkDescription: "On the house after 7 nights.",
    });
    expect(program).toEqual({
      enabled: true,
      nightsForPerk: 7,
      perkTitle: "Breakfast",
      perkDescription: "On the house after 7 nights.",
    });
  });
});
