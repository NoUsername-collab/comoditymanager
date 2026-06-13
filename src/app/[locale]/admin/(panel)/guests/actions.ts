"use server";

import { revalidatePath } from "next/cache";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { revalidateBookingSurfacesExtended } from "@/lib/cache/revalidate-admin";
import type {
  GuestDocType,
  GuestFlagLevel,
  GuestNationalIdType,
  GuestSex,
  GuestTag,
} from "@/domain/guest/types";
import {
  validateNationalId,
  cleanNationalId,
  NATIONAL_ID_TYPES,
} from "@/domain/guest/national-id";
import type { NationalIdType } from "@/domain/guest/national-id";
import { parseGuestTags } from "@/domain/guest/tags";
import { assertValidGuestPhone } from "@/domain/guest/normalize";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  findGuestByNationalId,
  mergeGuests,
  rebookGuestLastStay,
  rebookGuestSamePeriodNextYear,
  updateGuestIdentity,
  updateGuestNotes,
  updateGuestPhone,
  updateGuestTags,
} from "@/services/guests";
import type { GuestIdentityInput } from "@/services/guests";
import {
  saveGuestStayReview,
  updateGuestProfileControls,
} from "@/services/guest-profiles";
import { getTranslations } from "next-intl/server";

function revalidateGuestPaths(guestId: string, bookingId?: string) {
  revalidatePath("/admin/guests");
  revalidatePath(`/admin/guests/${guestId}`);
  revalidateBookingSurfacesExtended({ includeHistoric: true, bookingId });
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

function parseOptionalStarsField(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(1, Math.min(5, Math.round(parsed)));
}

export async function updateGuestNotesAction(formData: FormData) {
  const t = await getTranslations("admin.serverActions");
  await requireAdmin();
  const guestId = String(formData.get("guest_id") ?? "");
  const notes = String(formData.get("notes") ?? "");
  if (!guestId) throw new Error(t("invalidGuest"));
  await updateGuestNotes(guestId, notes);
  revalidateGuestPaths(guestId);
}

export async function updateGuestTagsAction(formData: FormData) {
  const t = await getTranslations("admin.serverActions");
  await requireAdmin();
  const guestId = String(formData.get("guest_id") ?? "");
  if (!guestId) throw new Error(t("invalidGuest"));
  const tags = formData.getAll("tags").map(String) as GuestTag[];
  await updateGuestTags(guestId, parseGuestTags(tags));
  revalidateGuestPaths(guestId);
}

export async function mergeGuestsAction(formData: FormData) {
  const t = await getTranslations("admin.serverActions");
  await requireAdmin();
  const targetId = String(formData.get("target_id") ?? "");
  const sourceId = String(formData.get("source_id") ?? "");
  if (!targetId || !sourceId) throw new Error(t("selectProfileToMerge"));
  await mergeGuests(sourceId, targetId);
  revalidateGuestPaths(targetId);
  await redirect(`/admin/guests/${targetId}?toast=merged`);
}

export async function rebookLastStayAction(formData: FormData) {
  const t = await getTranslations("admin.serverActions");
  await requireAdmin();
  const guestId = String(formData.get("guest_id") ?? "");
  if (!guestId) throw new Error(t("invalidGuest"));
  const bookingId = await rebookGuestLastStay(guestId);
  revalidateGuestPaths(guestId);
  await redirect(`/admin/bookings/${bookingId}?toast=rebooked`);
}

export async function rebookNextYearAction(formData: FormData) {
  const t = await getTranslations("admin.serverActions");
  await requireAdmin();
  const guestId = String(formData.get("guest_id") ?? "");
  if (!guestId) throw new Error(t("invalidGuest"));
  const bookingId = await rebookGuestSamePeriodNextYear(guestId);
  revalidateGuestPaths(guestId);
  await redirect(`/admin/bookings/${bookingId}?toast=rebooked`);
}

export async function updateGuestProfileControlsAction(formData: FormData) {
  const t = await getTranslations("admin.serverActions");
  await requireAdmin();
  const guestId = String(formData.get("guest_id") ?? "");
  if (!guestId) throw new Error(t("invalidGuest"));

  const rawFlag = String(formData.get("flag_level") ?? "normal");
  const flagLevel: GuestFlagLevel =
    rawFlag === "watchlist" || rawFlag === "blacklist" ? rawFlag : "normal";

  await updateGuestProfileControls({
    guestId,
    flagLevel,
    blacklistReason: String(formData.get("blacklist_reason") ?? ""),
    manualNote: String(formData.get("manual_note") ?? ""),
  });

  revalidateGuestPaths(guestId);
}

const VALID_DOC_TYPES = new Set(["ci", "passport", "foreign_id", "other"]);
const VALID_SEX = new Set(["M", "F"]);
const VALID_NATIONAL_ID_TYPES = new Set(NATIONAL_ID_TYPES);

function parseOptionalStr(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v || null;
}

function parseOptionalDate(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
}

export type GuestIdentityActionResult =
  | { ok: true }
  | { ok: false; error: string };

function isDuplicateNationalIdDbError(message: string): boolean {
  return /duplicate key|guests_tenant_national_id_uidx|guests_tenant_cnp_uidx|guests_national_id_uidx/i.test(
    message
  );
}

function mapGuestIdentityActionError(
  error: unknown,
  tActions: (key: string, values?: Record<string, string>) => string,
  tIdentity: (key: string, values?: Record<string, string | number>) => string
): string {
  if (!(error instanceof Error)) {
    return tIdentity("saveFailed");
  }

  const msg = error.message;

  if (msg === "guest.national_id_taken") {
    return tIdentity("nationalIdTaken");
  }
  if (msg === "guest.doc_expiry_required") {
    return tIdentity("docExpiryRequired");
  }
  if (msg === "guest.phone_required") {
    return tIdentity("phoneRequired");
  }
  if (msg === "auth.role_forbidden") {
    return tActions("roleForbidden");
  }
  if (isDuplicateNationalIdDbError(msg)) {
    return tIdentity("nationalIdTaken");
  }

  return msg || tIdentity("saveFailed");
}

export async function updateGuestIdentityAction(
  formData: FormData
): Promise<GuestIdentityActionResult> {
  const [tActions, tIdentity] = await Promise.all([
    getTranslations("admin.serverActions"),
    getTranslations("admin.guests.identity"),
  ]);

  try {
    await requireAdmin();
    const guestId = String(formData.get("guest_id") ?? "");
    if (!guestId) {
      return { ok: false, error: tActions("invalidGuest") };
    }

    const phoneRaw = String(formData.get("phone") ?? "").trim();
    assertValidGuestPhone(phoneRaw);
    await updateGuestPhone(guestId, phoneRaw);

    const rawDocType = parseOptionalStr(formData, "doc_type");
    const docType = rawDocType && VALID_DOC_TYPES.has(rawDocType)
      ? (rawDocType as GuestDocType)
      : null;

    const rawSex = parseOptionalStr(formData, "sex");
    const sex = rawSex && VALID_SEX.has(rawSex) ? (rawSex as GuestSex) : null;

    const rawNationalIdType = parseOptionalStr(formData, "national_id_type");
    const nationalIdType =
      rawNationalIdType &&
      VALID_NATIONAL_ID_TYPES.has(rawNationalIdType as NationalIdType)
        ? (rawNationalIdType as GuestNationalIdType)
        : null;

    const nationalIdRaw = parseOptionalStr(formData, "national_id");
    let nationalId: string | null = null;
    let idBirthDate: string | null = null;
    let idSex: GuestSex | null = null;

    if (nationalIdType && nationalIdRaw) {
      const cleaned = cleanNationalId(nationalIdRaw);
      const result = validateNationalId(nationalIdType, cleaned);
      if (!result.valid) {
        return {
          ok: false,
          error: tIdentity("nationalIdInvalid", {
            type: nationalIdType.toUpperCase(),
          }),
        };
      }
      nationalId = cleaned;

      if (result.data?.birthDate) idBirthDate = result.data.birthDate;
      if (result.data?.sex) idSex = result.data.sex;

      const existing = await findGuestByNationalId(cleaned, guestId);
      if (existing) {
        return {
          ok: false,
          error: tIdentity("nationalIdTakenNamed", {
            name: existing.display_name,
          }),
        };
      }
    }

    const cnp = nationalIdType === "cnp" ? nationalId : null;

    const input: GuestIdentityInput = {
      doc_type: docType,
      doc_series: parseOptionalStr(formData, "doc_series"),
      doc_number: parseOptionalStr(formData, "doc_number"),
      doc_issued_by: parseOptionalStr(formData, "doc_issued_by"),
      doc_issue_date: parseOptionalDate(formData, "doc_issue_date"),
      doc_expiry_date: parseOptionalDate(formData, "doc_expiry_date"),
      national_id_type: nationalIdType,
      national_id: nationalId,
      cnp,
      birth_date: idBirthDate ?? parseOptionalDate(formData, "birth_date"),
      birth_place: parseOptionalStr(formData, "birth_place"),
      nationality: parseOptionalStr(formData, "nationality"),
      address: parseOptionalStr(formData, "address"),
      city: parseOptionalStr(formData, "city"),
      county: parseOptionalStr(formData, "county"),
      country: parseOptionalStr(formData, "country"),
      sex: idSex ?? sex,
    };

    await updateGuestIdentity(guestId, input);
    revalidateGuestPaths(guestId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: mapGuestIdentityActionError(error, tActions, tIdentity),
    };
  }
}

export async function saveGuestStayReviewAction(formData: FormData) {
  const t = await getTranslations("admin.serverActions");
  await requireAdmin();
  const guestId = String(formData.get("guest_id") ?? "");
  const bookingId = String(formData.get("booking_id") ?? "");
  if (!guestId || !bookingId) throw new Error(t("invalidReview"));

  await saveGuestStayReview({
    guestId,
    bookingId,
    positiveNote: String(formData.get("positive_note") ?? ""),
    negativeNote: String(formData.get("negative_note") ?? ""),
    positiveStars: parseOptionalStarsField(formData.get("positive_stars")),
    negativeStars: parseOptionalStarsField(formData.get("negative_stars")),
  });

  revalidateGuestPaths(guestId, bookingId);
}
