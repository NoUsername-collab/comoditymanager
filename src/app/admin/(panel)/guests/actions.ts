"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { GuestTag } from "@/domain/guest/types";
import { parseGuestTags } from "@/domain/guest/tags";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  mergeGuests,
  rebookGuestLastStay,
  rebookGuestSamePeriodNextYear,
  updateGuestNotes,
  updateGuestTags,
} from "@/services/guests";

function revalidateGuestPaths(guestId: string) {
  revalidatePath("/admin/guests");
  revalidatePath(`/admin/guests/${guestId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/cazari");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/istoric");
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
