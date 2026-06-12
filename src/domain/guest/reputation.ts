import type {
  GuestBookingFlagSummary,
  GuestFlagLevel,
  GuestProfileRow,
  GuestStayReviewRow,
} from "./types";

const STAR_TRUST_WEIGHTS: Record<number, number> = {
  1: -28,
  2: -14,
  3: 0,
  4: 8,
  5: 16,
};

export const DEFAULT_TRUST_SCORE = 60;
export const DEFAULT_LOYALTY_SCORE = 0;
/** 0 = unrated (no reviews yet). Never penalize new guests with a low star score. */
export const DEFAULT_STARS_AVG = 0;

export function clampGuestScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function roundGuestStars(value: number): number {
  return Math.round(value * 10) / 10;
}

export function resolveGuestStarsAverage(
  starsAvg: number | null | undefined,
  reviewCount: number | null | undefined
): number {
  if ((reviewCount ?? 0) <= 0) return DEFAULT_STARS_AVG;

  const numericValue = Number(starsAvg);
  if (!Number.isFinite(numericValue)) return DEFAULT_STARS_AVG;
  return roundGuestStars(Math.max(1, Math.min(5, numericValue)));
}

export function isGuestFlagged(level: GuestFlagLevel): boolean {
  return level === "watchlist" || level === "blacklist";
}

export function flagSeverity(level: GuestFlagLevel): number {
  return level === "blacklist" ? 2 : level === "watchlist" ? 1 : 0;
}

export function maxGuestFlagLevel(
  left: GuestFlagLevel,
  right: GuestFlagLevel
): GuestFlagLevel {
  return flagSeverity(left) >= flagSeverity(right) ? left : right;
}

export function deriveLoyaltyBaseScore(
  completedStays: number,
  totalNights: number,
  lastStayCheckOut: string | null,
  today = new Date()
): number {
  if (completedStays <= 0) return DEFAULT_LOYALTY_SCORE;

  let score = 0;
  score += Math.min(55, completedStays * 12);
  score += Math.min(25, totalNights);

  if (lastStayCheckOut) {
    const last = new Date(`${lastStayCheckOut}T00:00:00`);
    const diffDays = Math.floor(
      (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays <= 180) score += 20;
    else if (diffDays <= 365) score += 14;
    else if (diffDays <= 730) score += 8;
    else score += 3;
  }

  return clampGuestScore(score);
}

export function calculateReviewTrustImpact(review: {
  stars: number;
  trust_delta: number;
}): number {
  const starsWeight = STAR_TRUST_WEIGHTS[review.stars] ?? 0;
  return starsWeight + review.trust_delta;
}

export function createDefaultGuestProfile(guestId: string): GuestProfileRow {
  const now = new Date().toISOString();
  return {
    guest_id: guestId,
    trust_score: DEFAULT_TRUST_SCORE,
    loyalty_score: DEFAULT_LOYALTY_SCORE,
    stars_avg: DEFAULT_STARS_AVG,
    flag_level: "normal",
    blacklist_reason: null,
    blacklisted_at: null,
    blacklisted_by: null,
    blacklisted_by_email: null,
    unblacklisted_at: null,
    unblacklisted_by: null,
    unblacklisted_by_email: null,
    manual_trust_adjustment: 0,
    manual_loyalty_adjustment: 0,
    manual_note: null,
    completed_stays: 0,
    total_nights: 0,
    last_stay_check_out: null,
    review_count: 0,
    created_at: now,
    updated_at: now,
  };
}

export function mapGuestProfileRow(row: Record<string, unknown>): GuestProfileRow {
  const guestId = String(row.guest_id ?? "");
  const fallback = createDefaultGuestProfile(guestId);
  const reviewCount = Number(row.review_count ?? fallback.review_count);

  return {
    guest_id: guestId,
    trust_score: Number(row.trust_score ?? fallback.trust_score),
    loyalty_score: Number(row.loyalty_score ?? fallback.loyalty_score),
    stars_avg: resolveGuestStarsAverage(row.stars_avg as number | undefined, reviewCount),
    flag_level:
      row.flag_level === "watchlist" || row.flag_level === "blacklist"
        ? row.flag_level
        : "normal",
    blacklist_reason:
      row.blacklist_reason != null ? String(row.blacklist_reason) : null,
    blacklisted_at: row.blacklisted_at != null ? String(row.blacklisted_at) : null,
    blacklisted_by: row.blacklisted_by != null ? String(row.blacklisted_by) : null,
    blacklisted_by_email:
      row.blacklisted_by_email != null ? String(row.blacklisted_by_email) : null,
    unblacklisted_at:
      row.unblacklisted_at != null ? String(row.unblacklisted_at) : null,
    unblacklisted_by:
      row.unblacklisted_by != null ? String(row.unblacklisted_by) : null,
    unblacklisted_by_email:
      row.unblacklisted_by_email != null ? String(row.unblacklisted_by_email) : null,
    manual_trust_adjustment: Number(
      row.manual_trust_adjustment ?? fallback.manual_trust_adjustment
    ),
    manual_loyalty_adjustment: Number(
      row.manual_loyalty_adjustment ?? fallback.manual_loyalty_adjustment
    ),
    manual_note: row.manual_note != null ? String(row.manual_note) : null,
    completed_stays: Number(row.completed_stays ?? fallback.completed_stays),
    total_nights: Number(row.total_nights ?? fallback.total_nights),
    last_stay_check_out:
      row.last_stay_check_out != null ? String(row.last_stay_check_out) : null,
    review_count: reviewCount,
    created_at: row.created_at != null ? String(row.created_at) : fallback.created_at,
    updated_at: row.updated_at != null ? String(row.updated_at) : fallback.updated_at,
  };
}

export function mapGuestStayReviewRow(
  row: Record<string, unknown>
): GuestStayReviewRow {
  return {
    booking_id: String(row.booking_id),
    guest_id: String(row.guest_id),
    stars: Number(row.stars ?? 0),
    positive_note:
      row.positive_note != null ? String(row.positive_note) : null,
    negative_note:
      row.negative_note != null ? String(row.negative_note) : null,
    trust_delta: Number(row.trust_delta ?? 0),
    loyalty_delta: Number(row.loyalty_delta ?? 0),
    reviewed_at: String(row.reviewed_at),
    reviewed_by: row.reviewed_by != null ? String(row.reviewed_by) : null,
    reviewed_by_email:
      row.reviewed_by_email != null ? String(row.reviewed_by_email) : null,
    updated_at: String(row.updated_at),
  };
}

export function toGuestBookingFlagSummary(
  profile: GuestProfileRow
): GuestBookingFlagSummary {
  return {
    guest_id: profile.guest_id,
    trust_score: profile.trust_score,
    loyalty_score: profile.loyalty_score,
    stars_avg: profile.stars_avg,
    flag_level: profile.flag_level,
    blacklist_reason: profile.blacklist_reason,
    review_count: profile.review_count,
    completed_stays: profile.completed_stays,
    total_nights: profile.total_nights,
    last_stay_check_out: profile.last_stay_check_out,
    manual_note: profile.manual_note,
  };
}

export function computeGuestProfileSnapshot(args: {
  current: GuestProfileRow;
  completedStays: number;
  totalNights: number;
  lastStayCheckOut: string | null;
  reviews: GuestStayReviewRow[];
}): GuestProfileRow {
  const { current, completedStays, totalNights, lastStayCheckOut, reviews } = args;
  const trustBase =
    DEFAULT_TRUST_SCORE +
    reviews.reduce((sum, review) => sum + calculateReviewTrustImpact(review), 0);
  const loyaltyBase =
    deriveLoyaltyBaseScore(completedStays, totalNights, lastStayCheckOut) +
    reviews.reduce((sum, review) => sum + review.loyalty_delta, 0);
  const starsAvg =
    reviews.length > 0
      ? resolveGuestStarsAverage(
          reviews.reduce((sum, review) => sum + review.stars, 0) / reviews.length,
          reviews.length
        )
      : DEFAULT_STARS_AVG;

  return {
    ...current,
    trust_score: clampGuestScore(trustBase + current.manual_trust_adjustment),
    loyalty_score: clampGuestScore(loyaltyBase + current.manual_loyalty_adjustment),
    stars_avg: starsAvg,
    completed_stays: completedStays,
    total_nights: totalNights,
    last_stay_check_out: lastStayCheckOut,
    review_count: reviews.length,
  };
}
