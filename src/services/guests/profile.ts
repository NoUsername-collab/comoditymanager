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
  GuestIdentityInput,
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

import { findGuestByNationalId, getGuestBaseById } from "./lookup";

export type { GuestIdentityInput };

function computeIdentityStatus(input: GuestIdentityInput): GuestIdentityStatus {
  const hasDoc = input.doc_type != null && input.doc_number != null;
  const hasNationalId = input.national_id != null && input.national_id.length > 0;
  const hasCnp = input.cnp != null && input.cnp.length > 0;
  const hasBirthDate = input.birth_date != null;
  const hasNationality = input.nationality != null;
  const hasAddress = input.address != null;
  const hasSex = input.sex != null;
  const needsDocExpiry =
    hasDoc && !hasNationalId && !hasCnp
      ? input.doc_expiry_date != null
      : hasDoc
        ? input.doc_expiry_date != null
        : true;

  const coreFields = [hasDoc, hasNationalId || hasCnp || hasBirthDate, hasNationality, hasSex];
  const filledCore = coreFields.filter(Boolean).length;

  if (filledCore === coreFields.length && hasAddress && needsDocExpiry) return "complete";
  if (filledCore >= 1) return "partial";
  return "draft";
}

export async function updateGuestIdentity(
  guestId: string,
  input: GuestIdentityInput
): Promise<{ identityStatus: GuestIdentityStatus }> {
  const { tenantId, supabase } = await getTenantScope();
  const identityStatus = computeIdentityStatus(input);

  // Sync cnp field from national_id when type is cnp (backward compat)
  const cnpValue = input.national_id_type === "cnp"
    ? (input.national_id?.trim() || null)
    : (input.cnp?.trim() || null);

  const nationalIdForLookup = input.national_id?.trim() || cnpValue;
  if (nationalIdForLookup) {
    const taken = await findGuestByNationalId(nationalIdForLookup, guestId);
    if (taken) {
      throw new Error("guest.national_id_taken");
    }
  }

  const hasDocumentNumber = Boolean(input.doc_number?.trim());
  const hasDocumentType = input.doc_type != null;
  const roCiWithValidCnp =
    input.doc_type === "ci" &&
    Boolean(input.national_id?.trim() || input.cnp?.trim()) &&
    (input.national_id_type === "cnp" || Boolean(input.cnp?.trim()));

  if (
    (hasDocumentNumber || hasDocumentType) &&
    !input.doc_expiry_date &&
    !roCiWithValidCnp
  ) {
    throw new Error("guest.doc_expiry_required");
  }

  const patch: Record<string, unknown> = {
    identity_status: identityStatus,
    doc_type: input.doc_type,
    doc_series: input.doc_series?.trim() || null,
    doc_number: input.doc_number?.trim() || null,
    doc_issued_by: input.doc_issued_by?.trim() || null,
    doc_issue_date: input.doc_issue_date || null,
    doc_expiry_date: input.doc_expiry_date || null,
    national_id_type: input.national_id_type,
    national_id: input.national_id?.trim() || null,
    cnp: cnpValue,
    birth_date: input.birth_date || null,
    birth_place: input.birth_place?.trim() || null,
    nationality: input.nationality?.trim() || null,
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    county: input.county?.trim() || null,
    country: input.country?.trim() || null,
    sex: input.sex,
  };

  const { error } = await supabase
    .from("guests")
    .update(patch)
    .eq("tenant_id", tenantId)
    .eq("id", guestId);

  if (error) throw new Error(error.message);

  await logAdminActivityFromSession({
    action: "guest.identity_updated",
    entityType: "guest",
    entityId: guestId,
    summary: `Date identitate actualizate ??? ${identityStatus}`,
    metadata: { identityStatus, docType: input.doc_type },
  });

  return { identityStatus };
}

/**
 * Find a guest by national ID (CNP, EGN, IDNP, AMKA, Szem??lyi sz??m).
 * Searches both `national_id` and legacy `cnp` fields.
 */
export async function updateGuestPhone(
  guestId: string,
  rawPhone: string
): Promise<void> {
  assertValidGuestPhone(rawPhone);
  const phone = rawPhone.trim();
  const phoneNorm = normalizePhone(phone);
  const { tenantId, supabase } = await getTenantScope();
  const { error } = await supabase
    .from("guests")
    .update({
      phone,
      phone_normalized: phoneNorm,
    })
    .eq("tenant_id", tenantId)
    .eq("id", guestId);
  if (error) throw new Error(error.message);
}

export async function updateGuestNotes(
  guestId: string,
  notes: string
): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  const { error } = await supabase
    .from("guests")
    .update({ notes: notes.trim() || null })
    .eq("tenant_id", tenantId)
    .eq("id", guestId);
  if (error) throw new Error(error.message);
  await logAdminActivityFromSession({
    action: "guest.updated",
    entityType: "guest",
    entityId: guestId,
    summary: "Note client actualizate",
    metadata: {},
  });
}

export async function updateGuestTags(
  guestId: string,
  tags: GuestTag[]
): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  const { error } = await supabase
    .from("guests")
    .update({ tags })
    .eq("tenant_id", tenantId)
    .eq("id", guestId);
  if (error) throw new Error(error.message);
  await logAdminActivityFromSession({
    action: "guest.updated",
    entityType: "guest",
    entityId: guestId,
    summary: "Etichete client actualizate",
    metadata: { tags },
  });
}

