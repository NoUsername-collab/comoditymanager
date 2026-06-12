import type {
  GuestBookingFlagSummary,
  GuestFlagLevel,
  GuestProfileRow,
  GuestStayReviewRow,
} from "./types";

/** @deprecated Legacy DB default — no longer computed for UI. */
export const DEFAULT_TRUST_SCORE = 60;
/** @deprecated Legacy DB default — no longer computed for UI. */
export const DEFAULT_LOYALTY_SCORE = 0;
/** 0 = unrated (no reviews yet). Never penalize new guests with a low star score. */
export const DEFAULT_STARS_AVG = 0;

export function roundGuestStars(value: number): number {
  return Math.round(value * 10) / 10;
}

export function clampGuestNoteStars(value: number): number {
  return Math.max(1, Math.min(5, Math.round(value)));
}

/** Gravitate notă negativă (1=foarte grav) → contribuție la rating 1–5. */
export function ratingFromNegativeSeverity(severity: number): number {
  const s = clampGuestNoteStars(severity);
  return roundGuestStars(1 + ((s - 1) * 2) / 4);
}

/** Rating efectiv per sejur din stelele notelor pozitive/negative. */
export function computeStayReviewEffectiveStars(input: {
  positiveNote: string | null | undefined;
  negativeNote: string | null | undefined;
  positiveStars: number | null | undefined;
  negativeStars: number | null | undefined;
}): number | null {
  const posNote = input.positiveNote?.trim() ?? "";
  const negNote = input.negativeNote?.trim() ?? "";
  const hasPositive = posNote.length > 0;
  const hasNegative = negNote.length > 0;

  if (!hasPositive && !hasNegative) return null;

  const positiveRating = hasPositive
    ? clampGuestNoteStars(input.positiveStars ?? 3)
    : null;
  const negativeRating = hasNegative
    ? ratingFromNegativeSeverity(input.negativeStars ?? 3)
    : null;

  if (positiveRating != null && negativeRating != null) {
    return roundGuestStars((positiveRating + negativeRating) / 2);
  }
  return positiveRating ?? negativeRating;
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

/** Segment intern „client fidel” — fără scor 0–100 afișat. */
export function isGuestLoyal(
  profile: {
    completed_stays: number;
    total_nights: number;
    last_stay_check_out: string | null;
  },
  today = new Date()
): boolean {
  if (profile.completed_stays >= 3) return true;
  if (profile.total_nights >= 10) return true;
  if (profile.completed_stays >= 2 && profile.last_stay_check_out) {
    const last = new Date(`${profile.last_stay_check_out}T00:00:00`);
    const diffDays = Math.floor(
      (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays <= 365) return true;
  }
  return false;
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
    positive_stars:
      row.positive_stars != null ? Number(row.positive_stars) : null,
    negative_stars:
      row.negative_stars != null ? Number(row.negative_stars) : null,
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
  const effectiveRatings = reviews
    .map((review) =>
      computeStayReviewEffectiveStars({
        positiveNote: review.positive_note,
        negativeNote: review.negative_note,
        positiveStars: review.positive_stars,
        negativeStars: review.negative_stars,
      }) ?? (review.stars > 0 ? review.stars : null)
    )
    .filter((value): value is number => value != null);

  const starsAvg =
    effectiveRatings.length > 0
      ? resolveGuestStarsAverage(
          effectiveRatings.reduce((sum, value) => sum + value, 0) /
            effectiveRatings.length,
          effectiveRatings.length
        )
      : DEFAULT_STARS_AVG;

  return {
    ...current,
    stars_avg: starsAvg,
    completed_stays: completedStays,
    total_nights: totalNights,
    last_stay_check_out: lastStayCheckOut,
    review_count: reviews.length,
  };
}
