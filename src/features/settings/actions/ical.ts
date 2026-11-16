"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { checkModule } from "@/core/hooks/use-feature-gate";
import { requireStaffPermission } from "@/lib/auth/require-staff";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { suggestIcalFeedName } from "@/domain/ical/feed-url";
import {
  addRoomIcalFeed,
  removeRoomIcalFeed,
  rotateRoomIcalExportToken,
  syncTenantIcalFeedsNow,
  type AddFeedError,
} from "@/services/ical-sync";
import { logAdminActivityFromSession } from "@/services/activity-log";

const PAGE = "/admin/settings/ical";

type Fail<E extends string = string> = { ok: false; error: E };

/** Calendar sync is part of PRO and Business; the actions refuse it elsewhere. */
async function guard(): Promise<Fail<"plan_not_allowed"> | null> {
  await requireStaffPermission("pension_settings");
  return checkModule("ical_sync") ? null : { ok: false, error: "plan_not_allowed" };
}

async function refreshOccupancy() {
  const tenantId = await resolveTenantIdForData();
  revalidateTag(tenantTag(tenantId, CACHE_TAGS.bookingCounts), "max");
  revalidatePath(PAGE);
  revalidatePath("/admin/calendar");
}

export async function addIcalFeedAction(input: {
  roomId: string;
  url: string;
  name?: string;
}): Promise<{ ok: true; syncError?: string } | Fail<AddFeedError | "plan_not_allowed">> {
  const blocked = await guard();
  if (blocked) return blocked;
  const name =
    input.name?.trim() || suggestIcalFeedName(input.url.trim().replace(/^webcals?:/i, "https:"));
  const added = await addRoomIcalFeed({ roomId: input.roomId, name, url: input.url });
  if (!added.ok) return added;

  await logAdminActivityFromSession({
    action: "settings.updated",
    entityType: "room",
    entityId: input.roomId,
    summary: `iCal: ${name} added`,
    metadata: { section: "ical", feed_id: added.feedId },
  });
  // Bring the reservations in right away, so the owner sees whether the address works.
  const results = await syncTenantIcalFeedsNow();
  await refreshOccupancy();
  const mine = results.find((r) => r.feedId === added.feedId);
  return { ok: true, syncError: mine && !mine.ok ? mine.error : undefined };
}

export async function removeIcalFeedAction(feedId: string): Promise<{ ok: true } | Fail> {
  const blocked = await guard();
  if (blocked) return blocked;
  await removeRoomIcalFeed(feedId);
  await logAdminActivityFromSession({
    action: "settings.updated",
    entityType: "settings",
    summary: "iCal feed removed",
    metadata: { section: "ical", feed_id: feedId },
  });
  await refreshOccupancy();
  return { ok: true };
}

export async function syncIcalNowAction(): Promise<{ ok: true; failed: number } | Fail> {
  const blocked = await guard();
  if (blocked) return blocked;
  const results = await syncTenantIcalFeedsNow();
  await refreshOccupancy();
  return { ok: true, failed: results.filter((r) => !r.ok).length };
}

export async function rotateIcalExportAction(roomId: string): Promise<{ ok: true } | Fail> {
  const blocked = await guard();
  if (blocked) return blocked;
  await rotateRoomIcalExportToken(roomId);
  await logAdminActivityFromSession({
    action: "settings.updated",
    entityType: "room",
    entityId: roomId,
    summary: "iCal export address replaced",
    metadata: { section: "ical" },
  });
  revalidatePath(PAGE);
  return { ok: true };
}
