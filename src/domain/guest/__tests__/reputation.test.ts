import { describe, it, expect } from "vitest";
import {
  DEFAULT_STARS_AVG,
  DEFAULT_TRUST_SCORE,
  DEFAULT_LOYALTY_SCORE,
  resolveGuestStarsAverage,
  clampGuestScore,
  roundGuestStars,
  isGuestFlagged,
  flagSeverity,
  maxGuestFlagLevel,
  calculateReviewTrustImpact,
} from "@/domain/guest/reputation";

describe("DEFAULT constants", () => {
  it("DEFAULT_STARS_AVG is 0 (not 1)", () => {
    expect(DEFAULT_STARS_AVG).toBe(0);
  });

  it("DEFAULT_TRUST_SCORE is 60", () => {
    expect(DEFAULT_TRUST_SCORE).toBe(60);
  });

  it("DEFAULT_LOYALTY_SCORE is 0", () => {
    expect(DEFAULT_LOYALTY_SCORE).toBe(0);
  });
});

describe("resolveGuestStarsAverage", () => {
  it("returns DEFAULT_STARS_AVG (0) when reviewCount is 0", () => {
    expect(resolveGuestStarsAverage(null, 0)).toBe(0);
  });

  it("returns DEFAULT_STARS_AVG when reviewCount is null", () => {
    expect(resolveGuestStarsAverage(3.5, null)).toBe(0);
  });

  it("returns DEFAULT_STARS_AVG when reviewCount is negative", () => {
    expect(resolveGuestStarsAverage(4.0, -1)).toBe(0);
  });

  it("returns the star average when valid", () => {
    expect(resolveGuestStarsAverage(4.5, 3)).toBe(4.5);
  });

  it("clamps to minimum 1 star (not below)", () => {
    expect(resolveGuestStarsAverage(0.5, 1)).toBe(1);
  });

  it("clamps to maximum 5 stars (not above)", () => {
    expect(resolveGuestStarsAverage(5.5, 1)).toBe(5);
  });

  it("returns DEFAULT_STARS_AVG for NaN starsAvg", () => {
    expect(resolveGuestStarsAverage(NaN, 2)).toBe(0);
  });

  it("returns DEFAULT_STARS_AVG for undefined starsAvg with 0 reviews", () => {
    expect(resolveGuestStarsAverage(undefined, 0)).toBe(0);
  });

  it("rounds to one decimal place", () => {
    expect(resolveGuestStarsAverage(3.456, 5)).toBe(3.5);
  });
});

describe("clampGuestScore", () => {
  it("clamps negative values to 0", () => {
    expect(clampGuestScore(-10)).toBe(0);
  });

  it("clamps values above 100 to 100", () => {
    expect(clampGuestScore(150)).toBe(100);
  });

  it("returns value unchanged when in range", () => {
    expect(clampGuestScore(73)).toBe(73);
  });

  it("returns 0 for value 0", () => {
    expect(clampGuestScore(0)).toBe(0);
  });

  it("returns 100 for value 100", () => {
    expect(clampGuestScore(100)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clampGuestScore(42.7)).toBe(43);
    expect(clampGuestScore(42.3)).toBe(42);
  });
});

describe("roundGuestStars", () => {
  it("rounds to one decimal place", () => {
    expect(roundGuestStars(3.456)).toBe(3.5);
    expect(roundGuestStars(3.444)).toBe(3.4);
    expect(roundGuestStars(5.0)).toBe(5);
  });
});

describe("calculateReviewTrustImpact", () => {
  it("uses star weights and trust delta only", () => {
    expect(calculateReviewTrustImpact({ stars: 5, trust_delta: 0 })).toBe(16);
    expect(calculateReviewTrustImpact({ stars: 1, trust_delta: -5 })).toBe(-33);
  });
});

describe("isGuestFlagged", () => {
  it("returns true for watchlist", () => {
    expect(isGuestFlagged("watchlist")).toBe(true);
  });

  it("returns true for blacklist", () => {
    expect(isGuestFlagged("blacklist")).toBe(true);
  });

  it("returns false for normal", () => {
    expect(isGuestFlagged("normal")).toBe(false);
  });
});

describe("flagSeverity", () => {
  it("returns 2 for blacklist", () => {
    expect(flagSeverity("blacklist")).toBe(2);
  });

  it("returns 1 for watchlist", () => {
    expect(flagSeverity("watchlist")).toBe(1);
  });

  it("returns 0 for normal", () => {
    expect(flagSeverity("normal")).toBe(0);
  });
});

describe("maxGuestFlagLevel", () => {
  it("returns blacklist when either is blacklist", () => {
    expect(maxGuestFlagLevel("blacklist", "normal")).toBe("blacklist");
    expect(maxGuestFlagLevel("normal", "blacklist")).toBe("blacklist");
  });

  it("returns watchlist when both are watchlist/normal", () => {
    expect(maxGuestFlagLevel("watchlist", "normal")).toBe("watchlist");
  });

  it("returns normal when both are normal", () => {
    expect(maxGuestFlagLevel("normal", "normal")).toBe("normal");
  });
});
