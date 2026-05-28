import type {
  GuestBookingFlagSummary,
  GuestFlagLevel,
  GuestNegativeTrait,
  GuestPositiveTrait,
  GuestProfileRow,
  GuestStayReviewRow,
} from "@/domain/guest/types";
import {
  createDefaultGuestProfile,
  isGuestFlagged,
  mapGuestProfileRow,
  mapGuestStayReviewRow,
  maxGuestFlagLevel,
  toGuestBookingFlagSummary,
  computeGuestProfileSnapshot,
} from "@/domain/guest/reputation";
import { stayNightCount, todayIso } from "@/lib/stay-dates";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";
import { getAdminUser } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminActivityFromSession } from "@/services/activity-log";

type BookingReviewCheckRow = {
  id: string;
  guest_id: string | null;
  guest_name: string;
  status: string;
  check_out: string;
};

export type GuestAlertSnapshot = {
  level: GuestFlagLevel;
  note: string | null;
};

async function fetchGuestProfileRow(
  guestId: string
): Promise<GuestProfileRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guest_profiles")
    .select("*")
    .eq("guest_id", guestId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapGuestProfileRow(data as Record<string, unknown>) : null;
}

export async function ensureGuestProfiles(guestIds: string[]): Promise<void> {
  const uniqueIds = [...new Set(guestIds.filter(Boolean))];
  if (uniqueIds.length === 0) return;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("guest_profiles")
    .upsert(uniqueIds.map((guest_id) => ({ guest_id })), { onConflict: "guest_id" });

  if (error) throw new Error(error.message);
}

export async function getGuestProfile(
  guestId: string,
  options?: { recompute?: boolean }
): Promise<GuestProfileRow | null> {
  if (!guestId) return null;
  await ensureGuestProfiles([guestId]);

  if (options?.recompute) {
    return recomputeGuestProfile(guestId);
  }

  return fetchGuestProfileRow(guestId);
}

export async function listGuestProfileSummaries(
  guestIds: string[]
): Promise<Map<string, GuestBookingFlagSummary>> {
  const uniqueIds = [...new Set(guestIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();
  await ensureGuestProfiles(uniqueIds);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guest_profiles")
    .select("*")
    .in("guest_id", uniqueIds);

  if (error) throw new Error(error.message);

  return new Map(
    (data ?? []).map((row) => {
      const profile = mapGuestProfileRow(row as Record<string, unknown>);
      return [profile.guest_id, toGuestBookingFlagSummary(profile)];
    })
  );
}

export async function listFreshGuestProfileSummaries(
  guestIds: string[]
): Promise<Map<string, GuestBookingFlagSummary>> {
  const uniqueIds = [...new Set(guestIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  await Promise.all(uniqueIds.map((guestId) => recomputeGuestProfile(guestId)));
  return listGuestProfileSummaries(uniqueIds);
}

export async function listGuestStayReviewsByBookingIds(
  bookingIds: string[]
): Promise<Map<string, GuestStayReviewRow>> {
  const uniqueIds = [...new Set(bookingIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guest_stay_reviews")
    .select("*")
    .in("booking_id", uniqueIds);

  if (error) throw new Error(error.message);

  return new Map(
    (data ?? []).map((row) => {
      const review = mapGuestStayReviewRow(row as Record<string, unknown>);
      return [review.booking_id, review];
    })
  );
}

export async function listGuestStayReviewsForGuest(
  guestId: string
): Promise<GuestStayReviewRow[]> {
  if (!guestId) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guest_stay_reviews")
    .select("*")
    .eq("guest_id", guestId)
    .order("reviewed_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) =>
    mapGuestStayReviewRow(row as Record<string, unknown>)
  );
}

async function listCompletedStayStats(guestId: string): Promise<{
  completedStays: number;
  totalNights: number;
  lastStayCheckOut: string | null;
}> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("check_in, check_out")
    .eq("guest_id", guestId)
    .eq("status", "confirmata")
    .lt("check_out", await getEffectiveToday())
    .order("check_out", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as { check_in: string; check_out: string }[];
  return {
    completedStays: rows.length,
    totalNights: rows.reduce(
      (sum, booking) => sum + stayNightCount(booking.check_in, booking.check_out),
      0
    ),
    lastStayCheckOut: rows[0]?.check_out ?? null,
  };
}

export async function recomputeGuestProfile(
  guestId: string
): Promise<GuestProfileRow> {
  await ensureGuestProfiles([guestId]);
  const current = (await fetchGuestProfileRow(guestId)) ?? createDefaultGuestProfile(guestId);
  const [stats, reviews] = await Promise.all([
    listCompletedStayStats(guestId),
    listGuestStayReviewsForGuest(guestId),
  ]);

  const snapshot = computeGuestProfileSnapshot({
    current,
    completedStays: stats.completedStays,
    totalNights: stats.totalNights,
    lastStayCheckOut: stats.lastStayCheckOut,
    reviews,
  });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guest_profiles")
    .update({
      trust_score: snapshot.trust_score,
      loyalty_score: snapshot.loyalty_score,
      stars_avg: snapshot.stars_avg,
      positive_traits: snapshot.positive_traits,
      negative_traits: snapshot.negative_traits,
      completed_stays: snapshot.completed_stays,
      total_nights: snapshot.total_nights,
      last_stay_check_out: snapshot.last_stay_check_out,
      review_count: snapshot.review_count,
    })
    .eq("guest_id", guestId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapGuestProfileRow(data as Record<string, unknown>);
}

async function getBookingReviewCheck(
  bookingId: string
): Promise<BookingReviewCheckRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, guest_id, guest_name, status, check_out")
    .eq("id", bookingId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as BookingReviewCheckRow | null;
}

export async function saveGuestStayReview(input: {
  bookingId: string;
  guestId: string;
  stars: number;
  positiveTraits: GuestPositiveTrait[];
  negativeTraits: GuestNegativeTrait[];
  problemDetails: string;
  trustDelta: number;
  loyaltyDelta: number;
}): Promise<void> {
  const booking = await getBookingReviewCheck(input.bookingId);
  if (!booking) throw new Error("guest.stay_not_found");
  if (booking.guest_id !== input.guestId) {
    throw new Error("guest.review_not_belong_to_guest");
  }
  if (booking.status !== "confirmata" || booking.check_out >= await getEffectiveToday()) {
    throw new Error("guest.only_past_confirmed_stays_can_be_reviewed");
  }

  const actor = await getAdminUser();
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("guest_stay_reviews").upsert({
    booking_id: input.bookingId,
    guest_id: input.guestId,
    stars: input.stars,
    positive_traits: input.positiveTraits,
    negative_traits: input.negativeTraits,
    problem_details: input.problemDetails.trim() || null,
    trust_delta: input.trustDelta,
    loyalty_delta: input.loyaltyDelta,
    reviewed_at: now,
    reviewed_by: actor?.id ?? null,
    reviewed_by_email: actor?.email ?? null,
  });

  if (error) throw new Error(error.message);

  await recomputeGuestProfile(input.guestId);
  await logAdminActivityFromSession({
    action: "guest.reviewed",
    entityType: "guest",
    entityId: input.guestId,
    summary: `Review sejur actualizat pentru ${booking.guest_name}`,
    metadata: {
      booking_id: input.bookingId,
      stars: input.stars,
      positive_traits: input.positiveTraits,
      negative_traits: input.negativeTraits,
      trust_delta: input.trustDelta,
      loyalty_delta: input.loyaltyDelta,
    },
  });
}

export async function updateGuestProfileControls(input: {
  guestId: string;
  flagLevel: GuestFlagLevel;
  blacklistReason: string;
  manualTrustAdjustment: number;
  manualLoyaltyAdjustment: number;
  manualPositiveTraits: GuestPositiveTrait[];
  manualNegativeTraits: GuestNegativeTrait[];
  manualNote: string;
}): Promise<void> {
  await ensureGuestProfiles([input.guestId]);
  const current =
    (await fetchGuestProfileRow(input.guestId)) ?? createDefaultGuestProfile(input.guestId);
  const actor = await getAdminUser();
  const now = new Date().toISOString();
  const nextReason = input.blacklistReason.trim() || null;

  if (input.flagLevel === "blacklist" && !nextReason && !current.blacklist_reason) {
    throw new Error("guest.blacklist_reason_required");
  }

  const patch: Record<string, unknown> = {
    flag_level: input.flagLevel,
    blacklist_reason:
      input.flagLevel === "blacklist" ? nextReason ?? current.blacklist_reason : null,
    manual_trust_adjustment: input.manualTrustAdjustment,
    manual_loyalty_adjustment: input.manualLoyaltyAdjustment,
    manual_positive_traits: input.manualPositiveTraits,
    manual_negative_traits: input.manualNegativeTraits,
    manual_note: input.manualNote.trim() || null,
  };

  if (current.flag_level !== "blacklist" && input.flagLevel === "blacklist") {
    patch.blacklisted_at = now;
    patch.blacklisted_by = actor?.id ?? null;
    patch.blacklisted_by_email = actor?.email ?? null;
  }

  if (current.flag_level === "blacklist" && input.flagLevel !== "blacklist") {
    patch.unblacklisted_at = now;
    patch.unblacklisted_by = actor?.id ?? null;
    patch.unblacklisted_by_email = actor?.email ?? null;
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("guest_profiles")
    .update(patch)
    .eq("guest_id", input.guestId);

  if (error) throw new Error(error.message);

  await recomputeGuestProfile(input.guestId);

  const flagChanged = current.flag_level !== input.flagLevel;
  const adjustmentChanged =
    current.manual_trust_adjustment !== input.manualTrustAdjustment ||
    current.manual_loyalty_adjustment !== input.manualLoyaltyAdjustment ||
    current.manual_positive_traits.join("|") !== input.manualPositiveTraits.join("|") ||
    current.manual_negative_traits.join("|") !== input.manualNegativeTraits.join("|") ||
    (current.manual_note ?? "") !== (input.manualNote.trim() || "");

  if (flagChanged) {
    const action =
      input.flagLevel === "blacklist"
        ? "guest.blacklisted"
        : current.flag_level === "blacklist"
          ? "guest.unblacklisted"
          : "guest.flagged";
    await logAdminActivityFromSession({
      action,
      entityType: "guest",
      entityId: input.guestId,
      summary: `Flag level updated: ${input.flagLevel}`,
      metadata: {
        previous_flag_level: current.flag_level,
        next_flag_level: input.flagLevel,
        blacklist_reason: patch.blacklist_reason ?? null,
      },
    });
  } else if (adjustmentChanged) {
    await logAdminActivityFromSession({
      action: "guest.adjusted",
      entityType: "guest",
      entityId: input.guestId,
      summary: "Guest profile manually adjusted",
      metadata: {
        manual_trust_adjustment: input.manualTrustAdjustment,
        manual_loyalty_adjustment: input.manualLoyaltyAdjustment,
        manual_positive_traits: input.manualPositiveTraits,
        manual_negative_traits: input.manualNegativeTraits,
        manual_note: input.manualNote.trim() || null,
      },
    });
  }
}

export async function resolveGuestAlertSnapshot(input: {
  guestId: string | null;
  guestLastName: string;
  guestFirstName: string;
}): Promise<GuestAlertSnapshot> {
  const lastName = input.guestLastName.trim();
  const firstName = input.guestFirstName.trim();

  if (input.guestId) {
    const profile = await getGuestProfile(input.guestId);
    if (profile && isGuestFlagged(profile.flag_level)) {
      return {
        level: profile.flag_level,
        note:
          profile.flag_level === "blacklist"
            ? `Client marcat în blacklist${profile.blacklist_reason ? `: ${profile.blacklist_reason}` : ""}`
            : "Guest marked as watchlist",
      };
    }
  }

  if (!lastName || !firstName) {
    return { level: "normal", note: null };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guests")
    .select("id, display_name")
    .ilike("last_name", lastName)
    .ilike("first_name", firstName)
    .limit(10);

  if (error) throw new Error(error.message);

  const candidateIds = (data ?? [])
    .map((row) => String(row.id))
    .filter((id) => id !== input.guestId);

  if (candidateIds.length === 0) {
    return { level: "normal", note: null };
  }

  const summaries = await listGuestProfileSummaries(candidateIds);
  let best: { level: GuestFlagLevel; name: string; reason: string | null } | null = null;

  for (const row of data ?? []) {
    const id = String(row.id);
    if (id === input.guestId) continue;
    const profile = summaries.get(id);
    if (!profile || !isGuestFlagged(profile.flag_level)) continue;

    if (!best || maxGuestFlagLevel(profile.flag_level, best.level) === profile.flag_level) {
      best = {
        level: profile.flag_level,
        name: String(row.display_name ?? "client existent"),
        reason: profile.blacklist_reason,
      };
    }
  }

  if (!best) return { level: "normal", note: null };

  return {
    level: best.level,
    note:
      best.level === "blacklist"
        ? `Numele potrivește un client blacklistat: ${best.name}${best.reason ? ` (${best.reason})` : ""}`
        : `Numele potrivește un client în watchlist: ${best.name}`,
  };
}

export async function mergeGuestProfiles(
  sourceId: string,
  targetId: string
): Promise<void> {
  await ensureGuestProfiles([sourceId, targetId]);
  const [sourceProfile, targetProfile] = await Promise.all([
    getGuestProfile(sourceId),
    getGuestProfile(targetId),
  ]);

  const source = sourceProfile ?? createDefaultGuestProfile(sourceId);
  const target = targetProfile ?? createDefaultGuestProfile(targetId);
  const mergedFlag = maxGuestFlagLevel(source.flag_level, target.flag_level);

  const preservedBlacklist =
    mergedFlag === "blacklist"
      ? target.flag_level === "blacklist"
        ? target
        : source
      : null;

  const supabase = createAdminClient();
  const { error: reviewsError } = await supabase
    .from("guest_stay_reviews")
    .update({ guest_id: targetId })
    .eq("guest_id", sourceId);

  if (reviewsError) throw new Error(reviewsError.message);

  const { error: upsertError } = await supabase.from("guest_profiles").upsert({
    guest_id: targetId,
    flag_level: mergedFlag,
    blacklist_reason: preservedBlacklist?.blacklist_reason ?? null,
    blacklisted_at: preservedBlacklist?.blacklisted_at ?? null,
    blacklisted_by: preservedBlacklist?.blacklisted_by ?? null,
    blacklisted_by_email: preservedBlacklist?.blacklisted_by_email ?? null,
    unblacklisted_at:
      target.unblacklisted_at ?? source.unblacklisted_at ?? null,
    unblacklisted_by:
      target.unblacklisted_by ?? source.unblacklisted_by ?? null,
    unblacklisted_by_email:
      target.unblacklisted_by_email ?? source.unblacklisted_by_email ?? null,
    manual_trust_adjustment:
      target.manual_trust_adjustment + source.manual_trust_adjustment,
    manual_loyalty_adjustment:
      target.manual_loyalty_adjustment + source.manual_loyalty_adjustment,
    manual_positive_traits: [
      ...new Set([
        ...target.manual_positive_traits,
        ...source.manual_positive_traits,
      ]),
    ],
    manual_negative_traits: [
      ...new Set([
        ...target.manual_negative_traits,
        ...source.manual_negative_traits,
      ]),
    ],
    manual_note: [target.manual_note, source.manual_note]
      .filter(Boolean)
      .join("\n---\n") || null,
  });

  if (upsertError) throw new Error(upsertError.message);

  const { error: deleteError } = await supabase
    .from("guest_profiles")
    .delete()
    .eq("guest_id", sourceId);

  if (deleteError) throw new Error(deleteError.message);

  await recomputeGuestProfile(targetId);
}
