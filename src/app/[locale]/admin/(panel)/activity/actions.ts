"use server";

import { revalidateAfterActivityUndo } from "@/lib/cache/revalidate-admin";
import { requireStaffPermission } from "@/lib/auth/require-staff";
import { undoActivityLogEntry } from "@/services/activity-undo";
import { getTranslations } from "next-intl/server";

export type UndoActivityResult = { ok: true } | { ok: false; error: string };

export async function undoActivityLogAction(
  logId: string
): Promise<UndoActivityResult> {
  const t = await getTranslations("admin.activity");
  await requireStaffPermission("booking_management");

  if (!logId?.trim()) {
    return { ok: false, error: t("undoMissingId") };
  }

  try {
    await undoActivityLogEntry(logId.trim());
    revalidateAfterActivityUndo();
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : t("undoFailed");
    if (msg === "activity.undo_state_changed") {
      return { ok: false, error: t("undoStateChanged") };
    }
    if (msg === "activity.undo_not_allowed") {
      return { ok: false, error: t("undoNotAllowed") };
    }
    return { ok: false, error: msg };
  }
}

/**
 * Undo a booking cancellation by finding the latest `booking.cancelled`
 * activity log entry for the given booking and reversing it.
 */
export async function undoBookingCancellationAction(
  bookingId: string
): Promise<UndoActivityResult> {
  const t = await getTranslations("admin.activity");
  await requireStaffPermission("booking_management");

  if (!bookingId?.trim()) {
    return { ok: false, error: t("undoMissingId") };
  }

  try {
    const { getTenantScope } = await import("@/lib/tenant/scope");
    const { tenantId, supabase } = await getTenantScope();

    const { data, error } = await supabase
      .from("admin_activity_log")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("entity_type", "booking")
      .eq("entity_id", bookingId.trim())
      .eq("action", "booking.cancelled")
      .eq("undoable", true)
      .is("undone_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
      return { ok: false, error: t("undoNotAllowed") };
    }

    await undoActivityLogEntry(data.id);
    revalidateAfterActivityUndo();
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : t("undoFailed");
    if (msg === "activity.undo_state_changed") {
      return { ok: false, error: t("undoStateChanged") };
    }
    if (msg === "activity.undo_not_allowed") {
      return { ok: false, error: t("undoNotAllowed") };
    }
    return { ok: false, error: msg };
  }
}
