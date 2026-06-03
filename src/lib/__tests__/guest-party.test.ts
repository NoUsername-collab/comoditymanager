import { describe, it, expect } from "vitest";
import {
  guestPartyTotal,
  formatGuestPartyShort,
  formatGuestPartyDetail,
} from "@/lib/guest-party";

// ---------------------------------------------------------------------------
// guestPartyTotal
// ---------------------------------------------------------------------------
describe("guestPartyTotal", () => {
  it("sums adults and children", () => {
    expect(guestPartyTotal(2, 1)).toBe(3);
  });

  it("returns adults when no children", () => {
    expect(guestPartyTotal(3, 0)).toBe(3);
  });

  it("returns children when no adults", () => {
    expect(guestPartyTotal(0, 2)).toBe(2);
  });

  it("returns 0 for empty party", () => {
    expect(guestPartyTotal(0, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// formatGuestPartyShort
// ---------------------------------------------------------------------------
describe("formatGuestPartyShort", () => {
  it('formats as "N pers."', () => {
    expect(formatGuestPartyShort(2, 1)).toBe("3 pers.");
  });

  it("handles adults only", () => {
    expect(formatGuestPartyShort(1, 0)).toBe("1 pers.");
  });
});

// ---------------------------------------------------------------------------
// formatGuestPartyDetail
// ---------------------------------------------------------------------------
describe("formatGuestPartyDetail", () => {
  it('returns "N adulți" when there are no children', () => {
    expect(formatGuestPartyDetail(2, 0)).toBe("2 adulți");
  });

  it('returns "N ad. + M cop." when children present', () => {
    expect(formatGuestPartyDetail(2, 1)).toBe("2 ad. + 1 cop.");
  });

  it("handles single adult with children", () => {
    expect(formatGuestPartyDetail(1, 3)).toBe("1 ad. + 3 cop.");
  });
});
