"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";
import { revalidateBookingSurfacesExtended } from "@/lib/cache/revalidate-admin";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { eraseGuestPersonalData, updateGuestRetentionMonths } from "@/services/guest-privacy";
import { isGuestRetentionMonths } from "@/domain/guest/privacy";

/** The word the owner types to confirm an erasure that cannot be undone. */
const ERASE_CONFIRM_WORDS = ["STERGE", "ȘTERGE", "ERASE", "ИЗТРИЙ"];

type Fail = {
  ok: false;
  error:
    | "owner_only"
    | "confirm_mismatch"
    | "guest.not_found"
    | "guest.has_open_stay"
    | "retention_invalid";
};

/**
 * Erases a guest's personal data on their request (GDPR art. 17). Only the
 * owner may, and only by typing the confirmation word: it cannot be undone.
 */
export async function eraseGuestPersonalDataAction(input: {
  guestId: string;
  confirm: string;
}): Promise<{ ok: true } | Fail> {
  const { memberRole } = await requireStaff();
  if (memberRole !== "owner") return { ok: false, error: "owner_only" };
  if (!ERASE_CONFIRM_WORDS.includes(input.confirm.trim().toUpperCase())) {
    return { ok: false, error: "confirm_mismatch" };
  }

  const result = await eraseGuestPersonalData(input.guestId);
  if (!result.ok) return result;

  // The log keeps that it happened, never whose data it was.
  await logAdminActivityFromSession({
    action: "guest.personal_data_erased",
    entityType: "guest",
    entityId: input.guestId,
    summary: "Guest personal data erased on request (GDPR)",
    metadata: {},
  });
  revalidatePath("/admin/guests");
  revalidatePath(`/admin/guests/${input.guestId}`);
  revalidateBookingSurfacesExtended({ includeHistoric: true });
  return { ok: true };
}

/** How long identity documents are kept after the last stay. Owner only. */
export async function updateGuestRetentionAction(months: number): Promise<{ ok: true } | Fail> {
  const { memberRole } = await requireStaff();
  if (memberRole !== "owner") return { ok: false, error: "owner_only" };
  if (!isGuestRetentionMonths(months)) return { ok: false, error: "retention_invalid" };
  await updateGuestRetentionMonths(months);
  await logAdminActivityFromSession({
    action: "settings.updated",
    entityType: "settings",
    summary: `Guest identity retention: ${months} months`,
    metadata: { section: "privacy", months },
  });
  revalidatePath("/admin/settings/security");
  return { ok: true };
}
