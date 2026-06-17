import { describe, it, expect } from "vitest";
import {
  DEFAULT_STARS_AVG,
  resolveGuestStarsAverage,
  roundGuestStars,
  isGuestFlagged,
  isReturningGuest,
  flagSeverity,
  maxGuestFlagLevel,
  computeGuestProfileSnapshot,
  computeCompletedStayStats,
  createDefaultGuestProfile,
  ratingFromNegativeSeverity,
  computeStayReviewEffectiveStars,
} from "@/domain/guest/reputation";

describe("DEFAULT constants", () => {
  it("DEFAULT_STARS_AVG is 0 (not 1)", () => {
    expect(DEFAULT_STARS_AVG).toBe(0);
  });
});

describe("computeCompletedStayStats", () => {
  it("counts only stays with checkout before today", () => {
    const stats = computeCompletedStayStats(
      [
        { check_in: "2026-01-01", check_out: "2026-01-04" },
        { check_in: "2026-06-01", check_out: "2026-06-10" },
      ],
      "2026-06-05"
    );

    expect(stats.completed_stays).toBe(1);
    expect(stats.total_nights).toBe(3);
    expect(stats.last_stay_check_out).toBe("2026-01-04");
  });

  it("returns zeros when no completed stays", () => {
    const stats = computeCompletedStayStats(
      [{ check_in: "2026-06-01", check_out: "2026-06-10" }],
      "2026-06-01"
    );

    expect(stats.completed_stays).toBe(0);
    expect(stats.total_nights).toBe(0);
    expect(stats.last_stay_check_out).toBeNull();
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

describe("roundGuestStars", () => {
  it("rounds to one decimal place", () => {
    expect(roundGuestStars(3.456)).toBe(3.5);
    expect(roundGuestStars(3.444)).toBe(3.4);
    expect(roundGuestStars(5.0)).toBe(5);
  });
});

describe("isReturningGuest", () => {
  it("returns true for 3+ completed stays", () => {
    expect(
      isReturningGuest({
        completed_stays: 3,
        total_nights: 2,
        last_stay_check_out: null,
      })
    ).toBe(true);
  });

  it("returns true for 10+ total nights", () => {
    expect(
      isReturningGuest({
        completed_stays: 1,
        total_nights: 10,
        last_stay_check_out: null,
      })
    ).toBe(true);
  });

  it("returns true for 2 stays with recent checkout", () => {
    expect(
      isReturningGuest(
        {
          completed_stays: 2,
          total_nights: 4,
          last_stay_check_out: "2026-01-01",
        },
        new Date("2026-06-01")
      )
    ).toBe(true);
  });

  it("returns false for new guests", () => {
    expect(
      isReturningGuest({
        completed_stays: 0,
        total_nights: 0,
        last_stay_check_out: null,
      })
    ).toBe(false);
  });
});

describe("ratingFromNegativeSeverity", () => {
  it("maps severity 1 (minor) to rating 5", () => {
    expect(ratingFromNegativeSeverity(1)).toBe(5);
  });

  it("maps severity 5 (major) to rating 1", () => {
    expect(ratingFromNegativeSeverity(5)).toBe(1);
  });
});

describe("computeStayReviewEffectiveStars", () => {
  it("uses positive intensity directly", () => {
    expect(
      computeStayReviewEffectiveStars({
        polarity: "positive",
        intensity: 5,
      })
    ).toBe(5);
  });

  it("maps negative severity to guest rating", () => {
    expect(
      computeStayReviewEffectiveStars({
        polarity: "negative",
        intensity: 5,
      })
    ).toBe(1);
  });

  it("maps minor negative to higher guest rating", () => {
    expect(
      computeStayReviewEffectiveStars({
        polarity: "negative",
        intensity: 1,
      })
    ).toBe(5);
  });
});

describe("computeGuestProfileSnapshot", () => {
  it("derives stars and stay stats from reviews and bookings", () => {
    const current = createDefaultGuestProfile("guest-1");
    const snapshot = computeGuestProfileSnapshot({
      current,
      today: "2026-06-10",
      completedStayBookings: [
        { check_in: "2026-01-01", check_out: "2026-01-04" },
      ],
      reviews: [
        {
          booking_id: "b1",
          guest_id: "guest-1",
          stars: 4,
          polarity: "positive",
          intensity: 4,
          note: "Nice",
          reviewed_at: "2026-01-10T12:00:00Z",
          reviewed_by: null,
          reviewed_by_email: null,
          updated_at: "2026-01-10T12:00:00Z",
        },
      ],
    });

    expect(snapshot.stars_avg).toBe(4);
    expect(snapshot.review_count).toBe(1);
    expect(snapshot.completed_stays).toBe(1);
    expect(snapshot.total_nights).toBe(3);
    expect(snapshot.last_stay_check_out).toBe("2026-01-04");
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
