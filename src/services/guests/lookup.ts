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
import { mapGuestRow } from "@/domain/guest/map-row";
import { getTenantScope } from "@/lib/tenant/scope";
import {
  ensureGuestProfiles,
  getGuestProfile,
  listGuestProfileSummaries,
  listGuestStayReviewsByBookingIds,
  mergeGuestProfiles,
} from "@/services/guest-profiles";
import { matchGuestByContact } from "./match-guest";

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

/** Caută client după nume+prenume — doar dacă există un singur match clar. */
export async function findGuestByNameParts(
  lastName: string,
  firstName: string,
): Promise<GuestRow | null> {
  const last = lastName.trim();
  const first = firstName.trim();
  if (last.length < 2 || first.length < 2) return null;

  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("guests")
    .select("id")
    .eq("tenant_id", tenantId)
    .ilike("last_name", last)
    .ilike("first_name", first)
    .order("updated_at", { ascending: false })
    .limit(2);
  if (error) throw new Error(error.message);

  const ids = ((data ?? []) as { id: string }[]).map((row) => row.id);
  if (ids.length === 1) {
    return getGuestBaseById(ids[0]!);
  }
  if (ids.length > 1) return null;

  const full = formatGuestFullName(last, first);
  const { data: byDisplay, error: displayError } = await supabase
    .from("guests")
    .select("id")
    .eq("tenant_id", tenantId)
    .ilike("display_name", full)
    .order("updated_at", { ascending: false })
    .limit(2);
  if (displayError) throw new Error(displayError.message);

  const displayIds = ((byDisplay ?? []) as { id: string }[]).map(
    (row) => row.id,
  );
  if (displayIds.length !== 1) return null;
  return getGuestBaseById(displayIds[0]!);
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
  const last = String(input.guest_last_name ?? "").trim();
  const first = String(input.guest_first_name ?? "").trim();
  const match = await matchGuestByContact({
    lastName: last,
    firstName: first,
    phone: input.guest_phone,
    email: input.guest_email,
  });

  if (match.status !== "matched") return null;

  const candidate = await getGuestBaseById(match.guestId);
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

  const sanitized = cleaned.replace(/[^a-zA-Z0-9]/g, "");
  if (!sanitized) return null;

  let query = supabase
    .from("guests")
    .select("*")
    .eq("tenant_id", tenantId)
    .or(`national_id.eq.${sanitized},cnp.eq.${sanitized}`)
    .limit(1)
    .maybeSingle();

  if (excludeGuestId) {
    query = supabase
      .from("guests")
      .select("*")
      .eq("tenant_id", tenantId)
      .or(`national_id.eq.${sanitized},cnp.eq.${sanitized}`)
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

