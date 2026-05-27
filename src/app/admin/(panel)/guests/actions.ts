"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  GuestFlagLevel,
  GuestNegativeTrait,
  GuestPositiveTrait,
  GuestTag,
} from "@/domain/guest/types";
import {
  parseGuestNegativeTraits,
  parseGuestPositiveTraits,
} from "@/domain/guest/reputation";
import { parseGuestTags } from "@/domain/guest/tags";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  mergeGuests,
  rebookGuestLastStay,
  rebookGuestSamePeriodNextYear,
  updateGuestNotes,
  updateGuestTags,
} from "@/services/guests";
import {
  saveGuestStayReview,
  updateGuestProfileControls,
} from "@/services/guest-profiles";

function revalidateGuestPaths(guestId: string) {
  revalidatePath("/admin/guests");
  revalidatePath(`/admin/guests/${guestId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/cazari");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/istoric");
}

function parseIntField(
  value: FormDataEntryValue | null,
  fallback = 0,
  min = -100,
  max = 100
): number {
  const parsed = Number(String(value ?? fallback).trim() || fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

export async function updateGuestNotesAction(formData: FormData) {
  await requireAdmin();
  const guestId = String(formData.get("guest_id") ?? "");
  const notes = String(formData.get("notes") ?? "");
  if (!guestId) throw new Error("Client invalid");
  await updateGuestNotes(guestId, notes);
  revalidateGuestPaths(guestId);
}

export async function updateGuestTagsAction(formData: FormData) {
  await requireAdmin();
  const guestId = String(formData.get("guest_id") ?? "");
  if (!guestId) throw new Error("Client invalid");
  const tags = formData.getAll("tags").map(String) as GuestTag[];
  await updateGuestTags(guestId, parseGuestTags(tags));
  revalidateGuestPaths(guestId);
}

export async function mergeGuestsAction(formData: FormData) {
  await requireAdmin();
  const targetId = String(formData.get("target_id") ?? "");
  const sourceId = String(formData.get("source_id") ?? "");
  if (!targetId || !sourceId) throw new Error("Selectează profilul de combinat");
  await mergeGuests(sourceId, targetId);
  revalidateGuestPaths(targetId);
  redirect(`/admin/guests/${targetId}?toast=merged`);
}

export async function rebookLastStayAction(formData: FormData) {
  await requireAdmin();
  const guestId = String(formData.get("guest_id") ?? "");
  if (!guestId) throw new Error("Client invalid");
  const bookingId = await rebookGuestLastStay(guestId);
  revalidateGuestPaths(guestId);
  redirect(`/admin/bookings/${bookingId}?toast=rebooked`);
}

export async function rebookNextYearAction(formData: FormData) {
  await requireAdmin();
  const guestId = String(formData.get("guest_id") ?? "");
  if (!guestId) throw new Error("Client invalid");
  const bookingId = await rebookGuestSamePeriodNextYear(guestId);
  revalidateGuestPaths(guestId);
  redirect(`/admin/bookings/${bookingId}?toast=rebooked`);
}

export async function updateGuestProfileControlsAction(formData: FormData) {
  await requireAdmin();
  const guestId = String(formData.get("guest_id") ?? "");
  if (!guestId) throw new Error("Client invalid");

  const rawFlag = String(formData.get("flag_level") ?? "normal");
  const flagLevel: GuestFlagLevel =
    rawFlag === "watchlist" || rawFlag === "blacklist" ? rawFlag : "normal";

  await updateGuestProfileControls({
    guestId,
    flagLevel,
    blacklistReason: String(formData.get("blacklist_reason") ?? ""),
    manualTrustAdjustment: parseIntField(
      formData.get("manual_trust_adjustment"),
      0,
      -40,
      40
    ),
    manualLoyaltyAdjustment: parseIntField(
      formData.get("manual_loyalty_adjustment"),
      0,
      -40,
      40
    ),
    manualPositiveTraits: parseGuestPositiveTraits(
      formData.getAll("manual_positive_traits").map(String) as GuestPositiveTrait[]
    ),
    manualNegativeTraits: parseGuestNegativeTraits(
      formData.getAll("manual_negative_traits").map(String) as GuestNegativeTrait[]
    ),
    manualNote: String(formData.get("manual_note") ?? ""),
  });

  revalidateGuestPaths(guestId);
}

export async function saveGuestStayReviewAction(formData: FormData) {
  await requireAdmin();
  const guestId = String(formData.get("guest_id") ?? "");
  const bookingId = String(formData.get("booking_id") ?? "");
  if (!guestId || !bookingId) throw new Error("Review invalid");

  const stars = parseIntField(formData.get("stars"), 5, 1, 5);
  const positiveTraits = parseGuestPositiveTraits(
    formData.getAll("positive_traits").map(String) as GuestPositiveTrait[]
  );
  const negativeTraits = parseGuestNegativeTraits(
    formData.getAll("negative_traits").map(String) as GuestNegativeTrait[]
  );

  await saveGuestStayReview({
    guestId,
    bookingId,
    stars,
    positiveTraits,
    negativeTraits,
    problemDetails: String(formData.get("problem_details") ?? ""),
    trustDelta: parseIntField(formData.get("trust_delta"), 0, -40, 40),
    loyaltyDelta: parseIntField(formData.get("loyalty_delta"), 0, -20, 20),
  });

  revalidateGuestPaths(guestId);
  revalidatePath(`/admin/bookings/${bookingId}`);
}
