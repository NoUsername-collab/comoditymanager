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

export async function findDuplicateGuestsForGuest(
  guestId: string
): Promise<GuestListItem[]> {
  const guest = await getGuestBaseById(guestId);
  if (!guest) return [];

  const { tenantId, supabase } = await getTenantScope();
  const orParts: string[] = [];
  if (guest.phone_normalized) {
    orParts.push(`phone_normalized.eq.${guest.phone_normalized}`);
  }
  if (guest.email_normalized) {
    orParts.push(`email_normalized.eq.${guest.email_normalized}`);
  }
  if (orParts.length === 0) return [];

  const { data, error } = await supabase
    .from("guests")
    .select("id, display_name, phone, email, tags, identity_status, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .or(orParts.join(","))
    .neq("id", guestId);
  if (error) throw new Error(error.message);

  return (data ?? []).map((g) => ({
    id: g.id as string,
    display_name: g.display_name as string,
    phone: g.phone as string | null,
    email: g.email as string | null,
    tags: parseGuestTags(g.tags),
    identity_status: (g.identity_status as GuestListItem["identity_status"]) ?? "draft",
    profile: null,
    created_at: g.created_at as string,
    updated_at: g.updated_at as string,
    booking_count: 0,
    last_stay_check_out: null,
  }));
}

