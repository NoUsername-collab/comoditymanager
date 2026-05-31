"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";
import { undoActivityLogEntry } from "@/services/activity-undo";
import { getTranslations } from "next-intl/server";

export type UndoActivityResult = { ok: true } | { ok: false; error: string };

function revalidateAfterUndo() {
  revalidatePath("/admin/istoric");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/cazari");
}

export async function undoActivityLogAction(
  logId: string
): Promise<UndoActivityResult> {
  const t = await getTranslations("admin.activity");
  await requireStaff();

  if (!logId?.trim()) {
    return { ok: false, error: t("undoMissingId") };
  }

  try {
    await undoActivityLogEntry(logId.trim());
    revalidateAfterUndo();
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
