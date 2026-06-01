import { formatGuestFullName } from "@/domain/guest-name";
import {
  shiftStayDatesByYears,
  shiftStayToNextFutureYear,
} from "@/domain/guest/rebook-dates";
import {
  assertValidGuestPhone,
  normalizeEmail,
  normalizePhone,
} from "@/domain/guest/normalize";
import { parseGuestTags } from "@/domain/guest/tags";
import type {
  GuestDocType,
  GuestHighlights,
  GuestBookingInput,
  GuestIdentityStatus,
  GuestListItem,
  GuestNationalIdType,
  GuestRow,
  GuestSearchFilter,
  GuestSearchResult,
  GuestSex,
  GuestStayReviewRow,
  GuestTag,
} from "@/domain/guest/types";
import { GUEST_MATCH_PRIORITY } from "@/domain/guest/matching-contract";
import type { BookingStatus } from "@/domain/booking/types";
import type { BookingRoomSegmentRow } from "@/domain/booking/segment-types";
import { stayNightCount } from "@/lib/stay-dates";
import { getTenantScope, withTenantId } from "@/lib/tenant/scope";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { mapGuestRow } from "@/domain/guest/map-row";
import {
  ensureGuestProfiles,
  getGuestProfile,
  listGuestProfileSummaries,
  listGuestStayReviewsByBookingIds,
  mergeGuestProfiles,
} from "@/services/guest-profiles";

import { getGuestBaseById } from "./lookup";

export async function mergeGuests(
  sourceId: string,
  targetId: string
): Promise<void> {
  if (sourceId === targetId) {
    throw new Error("guest.select_different_guest_for_merge");
  }

  const { tenantId, supabase } = await getTenantScope();
  const [source, target] = await Promise.all([
    getGuestBaseById(sourceId),
    getGuestBaseById(targetId),
  ]);
  if (!source || !target) throw new Error("guest.not_found");

  const { error: moveErr } = await supabase
    .from("bookings")
    .update({ guest_id: targetId })
    .eq("tenant_id", tenantId)
    .eq("guest_id", sourceId);
  if (moveErr) throw new Error(moveErr.message);

  const mergedTags = [...new Set([...target.tags, ...source.tags])];
  const mergedNotes = [target.notes, source.notes]
    .filter(Boolean)
    .join("\n---\n");

  const patch: Record<string, unknown> = {
    tags: mergedTags,
    notes: mergedNotes || null,
  };
  if (!target.phone && source.phone) {
    patch.phone = source.phone;
    patch.phone_normalized = source.phone_normalized;
  }
  if (!target.email && source.email) {
    patch.email = source.email;
    patch.email_normalized = source.email_normalized;
  }
  // Preserve identity fields from source when target lacks them
  if (!target.doc_type && source.doc_type) {
    patch.doc_type = source.doc_type;
    patch.doc_series = source.doc_series;
    patch.doc_number = source.doc_number;
    patch.doc_issued_by = source.doc_issued_by;
    patch.doc_issue_date = source.doc_issue_date;
    patch.doc_expiry_date = source.doc_expiry_date;
  }
  if (!target.national_id && source.national_id) {
    patch.national_id_type = source.national_id_type;
    patch.national_id = source.national_id;
    patch.cnp = source.cnp;
  }
  if (!target.birth_date && source.birth_date) {
    patch.birth_date = source.birth_date;
  }
  if (!target.birth_place && source.birth_place) {
    patch.birth_place = source.birth_place;
  }
  if (!target.sex && source.sex) {
    patch.sex = source.sex;
  }
  if (!target.nationality && source.nationality) {
    patch.nationality = source.nationality;
  }
  if (!target.address && source.address) {
    patch.address = source.address;
    patch.city = source.city;
    patch.county = source.county;
    patch.country = source.country;
  }

  const { error: updErr } = await supabase
    .from("guests")
    .update(patch)
    .eq("tenant_id", tenantId)
    .eq("id", targetId);
  if (updErr) throw new Error(updErr.message);

  await mergeGuestProfiles(sourceId, targetId);

  const { error: delErr } = await supabase
    .from("guests")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", sourceId);
  if (delErr) throw new Error(delErr.message);

  await logAdminActivityFromSession({
    action: "guest.merged",
    entityType: "guest",
    entityId: targetId,
    summary: `Profil combinat: ${source.display_name} ??? ${target.display_name}`,
    metadata: { source_id: sourceId },
  });
}

