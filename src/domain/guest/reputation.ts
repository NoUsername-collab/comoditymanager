import type {
  GuestBookingFlagSummary,
  GuestFlagLevel,
  GuestProfileRow,
  GuestStayReviewPolarity,
  GuestStayReviewRow,
} from "./types";
import { stayNightCount } from "@/lib/stay-dates";

/** 0 = unrated (no reviews yet). Never penalize new guests with a low star score. */
export const DEFAULT_STARS_AVG = 0;

export type CompletedStayBooking = {
  check_in: string;
  check_out: string;
};

export type CompletedStayStats = {
  completed_stays: number;
  total_nights: number;
  last_stay_check_out: string | null;
};

export function roundGuestStars(value: number): number {
  return Math.round(value * 10) / 10;
}

export function clampGuestNoteStars(value: number): number {
  return Math.max(1, Math.min(5, Math.round(value)));
}

/** Gravitate notă negativă (1=minor, 5=foarte grav) → contribuție la rating 1–5. */
export function ratingFromNegativeSeverity(severity: number): number {
  const s = clampGuestNoteStars(severity);
  return roundGuestStars(6 - s);
}

/** Rating efectiv per sejur din polarity + intensity. */
export function computeStayReviewEffectiveStars(input: {
  polarity: GuestStayReviewPolarity;
  intensity: number;
}): number {
  const intensity = clampGuestNoteStars(input.intensity);
  if (input.polarity === "positive") {
    return intensity;
  }
  return ratingFromNegativeSeverity(intensity);
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

/** Statistici sejururi terminate — sursă unică pentru profil și filtre. */
export function computeCompletedStayStats(
  bookings: CompletedStayBooking[],
  today: string
): CompletedStayStats {
  const completed = bookings
    .filter((booking) => booking.check_out < today)
    .sort((a, b) => b.check_out.localeCompare(a.check_out));

  return {
    completed_stays: completed.length,
    total_nights: completed.reduce(
      (sum, booking) => sum + stayNightCount(booking.check_in, booking.check_out),
      0
    ),
    last_stay_check_out: completed[0]?.check_out ?? null,
  };
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

/** Segment „client recurent” — bazat pe statistici de sejururi, nu pe scor legacy. */
export function isReturningGuest(
  stats: CompletedStayStats,
  today = new Date()
): boolean {
  if (stats.completed_stays >= 3) return true;
  if (stats.total_nights >= 10) return true;
  if (stats.completed_stays >= 2 && stats.last_stay_check_out) {
    const last = new Date(`${stats.last_stay_check_out}T00:00:00`);
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
    stars_avg: DEFAULT_STARS_AVG,
    flag_level: "normal",
    blacklist_reason: null,
    blacklisted_at: null,
    blacklisted_by: null,
    blacklisted_by_email: null,
    unblacklisted_at: null,
    unblacklisted_by: null,
    unblacklisted_by_email: null,
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
  const polarity =
    row.polarity === "negative" ? "negative" : "positive";
  const intensity = clampGuestNoteStars(Number(row.intensity ?? row.stars ?? 3));
  const note = String(row.note ?? "").trim() || "Review";

  return {
    booking_id: String(row.booking_id),
    guest_id: String(row.guest_id),
    stars: Number(row.stars ?? computeStayReviewEffectiveStars({ polarity, intensity })),
    polarity,
    intensity,
    note,
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

/** Snapshot profil: rating din review-uri + statistici sejururi terminate. */
export function computeGuestProfileSnapshot(args: {
  current: GuestProfileRow;
  completedStayBookings: CompletedStayBooking[];
  today: string;
  reviews: GuestStayReviewRow[];
}): GuestProfileRow {
  const { current, completedStayBookings, today, reviews } = args;
  const stayStats = computeCompletedStayStats(completedStayBookings, today);

  const effectiveRatings = reviews
    .map((review) =>
      computeStayReviewEffectiveStars({
        polarity: review.polarity,
        intensity: review.intensity,
      })
    )
    .filter((value): value is number => Number.isFinite(value));

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
    completed_stays: stayStats.completed_stays,
    total_nights: stayStats.total_nights,
    last_stay_check_out: stayStats.last_stay_check_out,
    review_count: reviews.length,
  };
}
