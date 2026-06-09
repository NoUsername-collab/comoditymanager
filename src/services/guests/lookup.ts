import { cache } from "react";
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

import { isPlaceholderEmail } from "@/domain/guest/normalize";

const loadGuestBaseById = cache(async (id: string): Promise<GuestRow | null> => {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapGuestRow(data) : null;
});

export async function getGuestBaseById(id: string): Promise<GuestRow | null> {
  return loadGuestBaseById(id);
}

async function findGuestByIdsOrdered(ids: string[]): Promise<GuestRow | null> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return null;
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("id", unique)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapGuestRow(data) : null;
}

export type GuestAutofillMatch = {
  guestId: string;
  lastName: string;
  firstName: string;
  email: string | null;
  phone: string | null;
  displayName: string;
  flagLevel: "normal" | "watchlist" | "blacklist" | null;
};

async function findGuestAutofillMatchImpl(input: {
  guest_last_name?: string;
  guest_first_name?: string;
  guest_email?: string;
  guest_phone?: string;
}): Promise<GuestAutofillMatch | null> {
  const emailNorm = normalizeEmail(input.guest_email ?? "");
  const phoneNorm = normalizePhone(input.guest_phone ?? "");
  const last = String(input.guest_last_name ?? "").trim();
  const first = String(input.guest_first_name ?? "").trim();
  const { tenantId, supabase } = await getTenantScope();
  let candidate: GuestRow | null = null;

  if (
    GUEST_MATCH_PRIORITY.includes("phone_email") &&
    phoneNorm &&
    emailNorm &&
    !isPlaceholderEmail(emailNorm)
  ) {
    const { data, error } = await supabase
      .from("guests")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("phone_normalized", phoneNorm)
      .eq("email_normalized", emailNorm)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.id) {
      candidate = await getGuestBaseById(String(data.id));
    }
  }

  if (!candidate && GUEST_MATCH_PRIORITY.includes("phone") && phoneNorm) {
    const { data, error } = await supabase
      .from("guests")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("phone_normalized", phoneNorm)
      .order("updated_at", { ascending: false })
      .limit(2);
    if (error) throw new Error(error.message);
    candidate = await findGuestByIdsOrdered(
      ((data ?? []) as { id: string }[]).map((row) => row.id)
    );
  }

  if (
    !candidate &&
    GUEST_MATCH_PRIORITY.includes("email") &&
    emailNorm &&
    !isPlaceholderEmail(emailNorm)
  ) {
    const { data, error } = await supabase
      .from("guests")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("email_normalized", emailNorm)
      .order("updated_at", { ascending: false })
      .limit(2);
    if (error) throw new Error(error.message);
    candidate = await findGuestByIdsOrdered(
      ((data ?? []) as { id: string }[]).map((row) => row.id)
    );
  }

  if (!candidate && GUEST_MATCH_PRIORITY.includes("name") && last && first) {
    const full = formatGuestFullName(last, first);
    const { data, error } = await supabase
      .from("guests")
      .select("id")
      .eq("tenant_id", tenantId)
      .ilike("display_name", full)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.id) candidate = await getGuestBaseById(String(data.id));
  }

  if (!candidate) return null;
  const profile = await getGuestProfile(candidate.id);
  return {
    guestId: candidate.id,
    lastName: candidate.last_name,
    firstName: candidate.first_name,
    email: candidate.email,
    phone: candidate.phone,
    displayName: candidate.display_name,
    flagLevel: profile?.flag_level ?? null,
  };
}

const loadGuestAutofillMatch = cache(
  async (
    lastName: string,
    firstName: string,
    email: string,
    phone: string
  ): Promise<GuestAutofillMatch | null> =>
    findGuestAutofillMatchImpl({
      guest_last_name: lastName,
      guest_first_name: firstName,
      guest_email: email,
      guest_phone: phone,
    })
);

export async function findGuestAutofillMatch(input: {
  guest_last_name?: string;
  guest_first_name?: string;
  guest_email?: string;
  guest_phone?: string;
}): Promise<GuestAutofillMatch | null> {
  return loadGuestAutofillMatch(
    String(input.guest_last_name ?? "").trim(),
    String(input.guest_first_name ?? "").trim(),
    String(input.guest_email ?? "").trim(),
    String(input.guest_phone ?? "").trim()
  );
}

const loadGuestById = cache(async (id: string): Promise<GuestRow | null> => {
  const [guest, profile] = await Promise.all([
    loadGuestBaseById(id),
    getGuestProfile(id, { recompute: false }),
  ]);
  if (!guest) return null;
  return { ...guest, profile };
});

export async function getGuestById(
  id: string,
  options?: { recomputeProfile?: boolean }
): Promise<GuestRow | null> {
  if (options?.recomputeProfile === true) {
    const guest = await getGuestBaseById(id);
    if (!guest) return null;
    const profile = await getGuestProfile(id, { recompute: true });
    return { ...guest, profile };
  }
  return loadGuestById(id);
}

const loadGuestByNationalId = cache(async (
  cleaned: string,
  excludeGuestId: string | null
): Promise<GuestRow | null> => {
  const { tenantId, supabase } = await getTenantScope();

  let query = supabase
    .from("guests")
    .select("*")
    .eq("tenant_id", tenantId)
    .or(`national_id.eq.${cleaned},cnp.eq.${cleaned}`)
    .limit(1)
    .maybeSingle();

  if (excludeGuestId) {
    query = supabase
      .from("guests")
      .select("*")
      .eq("tenant_id", tenantId)
      .or(`national_id.eq.${cleaned},cnp.eq.${cleaned}`)
      .neq("id", excludeGuestId)
      .limit(1)
      .maybeSingle();
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ? mapGuestRow(data) : null;
});

export async function findGuestByNationalId(
  nationalId: string,
  excludeGuestId?: string
): Promise<GuestRow | null> {
  const cleaned = nationalId.replace(/[\s\-]/g, "");
  if (!cleaned) return null;
  return loadGuestByNationalId(cleaned, excludeGuestId ?? null);
}

/** @deprecated Use findGuestByNationalId */
export const findGuestByCnp = findGuestByNationalId;

