import { formatGuestFullName } from "@/domain/guest-name";
import { shiftStayDatesByYears } from "@/domain/guest/rebook-dates";
import {
  hasGuestIdentity,
  isPlaceholderEmail,
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
import { createAdminClient } from "@/lib/supabase/admin";
import {
  logAdminActivity,
  logAdminActivityFromSession,
} from "@/services/activity-log";
import {
  assertRoomsAvailableForStay,
  createBookingRequest,
  getBookingById,
} from "@/services/bookings";
import {
  ensureGuestProfiles,
  getGuestProfile,
  listGuestProfileSummaries,
  listGuestStayReviewsByBookingIds,
  mergeGuestProfiles,
} from "@/services/guest-profiles";

function optStr(v: unknown): string | null {
  return v != null && v !== "" ? String(v) : null;
}

function mapGuestRow(row: Record<string, unknown>): GuestRow {
  return {
    id: String(row.id),
    last_name: String(row.last_name ?? ""),
    first_name: String(row.first_name ?? ""),
    display_name: String(row.display_name ?? ""),
    phone: optStr(row.phone),
    phone_normalized: optStr(row.phone_normalized),
    email: optStr(row.email),
    email_normalized: optStr(row.email_normalized),
    notes: optStr(row.notes),
    tags: parseGuestTags(row.tags),
    profile: null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),

    // Identity fields
    identity_status: (row.identity_status as GuestRow["identity_status"]) ?? "draft",
    doc_type: optStr(row.doc_type) as GuestRow["doc_type"],
    doc_series: optStr(row.doc_series),
    doc_number: optStr(row.doc_number),
    doc_issued_by: optStr(row.doc_issued_by),
    doc_issue_date: optStr(row.doc_issue_date),
    doc_expiry_date: optStr(row.doc_expiry_date),
    national_id_type: optStr(row.national_id_type) as GuestRow["national_id_type"],
    national_id: optStr(row.national_id),
    cnp: optStr(row.cnp),
    birth_date: optStr(row.birth_date),
    birth_place: optStr(row.birth_place),
    nationality: optStr(row.nationality),
    address: optStr(row.address),
    city: optStr(row.city),
    county: optStr(row.county),
    country: optStr(row.country),
    sex: optStr(row.sex) as GuestRow["sex"],
  };
}

export async function getGuestBaseById(id: string): Promise<GuestRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapGuestRow(data) : null;
}

async function findGuestByPhone(
  phoneNormalized: string
): Promise<GuestRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("phone_normalized", phoneNormalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapGuestRow(data) : null;
}

async function findGuestByEmail(
  emailNormalized: string
): Promise<GuestRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("email_normalized", emailNormalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapGuestRow(data) : null;
}

async function createGuestRecord(input: GuestBookingInput): Promise<string> {
  const emailNorm = normalizeEmail(input.guest_email);
  const phoneNorm = normalizePhone(input.guest_phone);
  const email =
    emailNorm && !isPlaceholderEmail(emailNorm) ? input.guest_email.trim() : null;
  const phone = phoneNorm ? input.guest_phone.trim() : null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guests")
    .insert({
      last_name: input.guest_last_name.trim(),
      first_name: input.guest_first_name.trim(),
      display_name: input.guest_name.trim(),
      email,
      email_normalized:
        emailNorm && !isPlaceholderEmail(emailNorm) ? emailNorm : null,
      phone,
      phone_normalized: phoneNorm,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  await ensureGuestProfiles([data.id]);
  return data.id;
}

async function touchGuestFromBooking(
  guestId: string,
  input: GuestBookingInput
): Promise<void> {
  const emailNorm = normalizeEmail(input.guest_email);
  const phoneNorm = normalizePhone(input.guest_phone);
  const supabase = createAdminClient();

  const patch: Record<string, unknown> = {
    last_name: input.guest_last_name.trim(),
    first_name: input.guest_first_name.trim(),
    display_name: input.guest_name.trim(),
  };

  if (phoneNorm) {
    patch.phone = input.guest_phone.trim();
    patch.phone_normalized = phoneNorm;
  }
  if (emailNorm && !isPlaceholderEmail(emailNorm)) {
    patch.email = input.guest_email.trim();
    patch.email_normalized = emailNorm;
  }

  const { error } = await supabase.from("guests").update(patch).eq("id", guestId);
  if (error) throw new Error(error.message);
}

export type ResolveGuestResult = {
  guestId: string | null;
  mergeConflict: boolean;
};

export type GuestAutofillMatch = {
  guestId: string;
  lastName: string;
  firstName: string;
  email: string | null;
  phone: string | null;
  displayName: string;
  flagLevel: "normal" | "watchlist" | "blacklist" | null;
};

/** Matching priority from domain contract. */
export async function resolveGuestForBooking(
  input: GuestBookingInput
): Promise<ResolveGuestResult> {
  if (!hasGuestIdentity(input)) {
    return { guestId: null, mergeConflict: false };
  }

  const emailNorm = normalizeEmail(input.guest_email);
  const phoneNorm = normalizePhone(input.guest_phone);
  const byPhone = phoneNorm ? await findGuestByPhone(phoneNorm) : null;
  const byEmail =
    emailNorm && !isPlaceholderEmail(emailNorm)
      ? await findGuestByEmail(emailNorm)
      : null;

  if (byPhone && byEmail && byPhone.id !== byEmail.id) {
    await touchGuestFromBooking(byPhone.id, input);
    return { guestId: byPhone.id, mergeConflict: true };
  }

  if (byPhone) {
    await touchGuestFromBooking(byPhone.id, input);
    return { guestId: byPhone.id, mergeConflict: false };
  }

  if (byEmail) {
    await touchGuestFromBooking(byEmail.id, input);
    return { guestId: byEmail.id, mergeConflict: false };
  }

  const guestId = await createGuestRecord(input);
  await logAdminActivity({
    action: "guest.created",
    entityType: "guest",
    entityId: guestId,
    summary: `Client nou: ${input.guest_name.trim()}`,
    metadata: {
      email: emailNorm,
      phone: phoneNorm,
    },
    actor: null,
  });

  return { guestId, mergeConflict: false };
}

async function findGuestByIdsOrdered(ids: string[]): Promise<GuestRow | null> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .in("id", unique)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapGuestRow(data) : null;
}

export async function findGuestAutofillMatch(input: {
  guest_last_name?: string;
  guest_first_name?: string;
  guest_email?: string;
  guest_phone?: string;
}): Promise<GuestAutofillMatch | null> {
  const emailNorm = normalizeEmail(input.guest_email ?? "");
  const phoneNorm = normalizePhone(input.guest_phone ?? "");
  const last = String(input.guest_last_name ?? "").trim();
  const first = String(input.guest_first_name ?? "").trim();
  const supabase = createAdminClient();
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

export async function getGuestById(
  id: string,
  options?: { recomputeProfile?: boolean }
): Promise<GuestRow | null> {
  const guest = await getGuestBaseById(id);
  if (!guest) return null;
  const profile = await getGuestProfile(id, {
    recompute: options?.recomputeProfile === true,
  });
  return { ...guest, profile };
}

type GuestListSelectRow = {
  id: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  tags: unknown;
  identity_status: string;
  created_at: string;
  updated_at: string;
};

function sanitizeGuestSearchTerm(term: string): string {
  return term.trim().replace(/[%_]/g, "");
}

function normalizeGuestFilter(filter?: string): GuestSearchFilter {
  switch (filter) {
    case "recent":
    case "flagged":
    case "blacklist":
    case "watchlist":
    case "rated":
    case "unreviewed":
    case "loyal":
      return filter;
    default:
      return "all";
  }
}

function normalizeGuestPage(page?: number): number {
  return Number.isFinite(page) && page && page > 0 ? Math.floor(page) : 1;
}

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function matchesGuestFilter(
  guest: GuestListItem,
  filter: GuestSearchFilter
): boolean {
  const profile = guest.profile;
  if (filter === "all") return true;
  if (filter === "flagged") return profile?.flag_level !== "normal";
  if (filter === "blacklist") return profile?.flag_level === "blacklist";
  if (filter === "watchlist") return profile?.flag_level === "watchlist";
  if (filter === "rated") return (profile?.review_count ?? 0) > 0;
  if (filter === "unreviewed") return (profile?.review_count ?? 0) === 0;
  if (filter === "loyal") {
    return (profile?.loyalty_score ?? 0) >= 65 || (profile?.completed_stays ?? 0) >= 3;
  }
  if (filter === "recent") {
    return (
      (profile?.last_stay_check_out != null &&
        profile.last_stay_check_out >= isoDaysAgo(365)) ||
      guest.updated_at >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    );
  }
  return true;
}

function guestFlagRank(level: string | null | undefined): number {
  if (level === "blacklist") return 2;
  if (level === "watchlist") return 1;
  return 0;
}

async function fetchGuestListItemsByIds(
  guestIds: string[]
): Promise<GuestListItem[]> {
  const ids = [...new Set(guestIds.filter(Boolean))];
  if (ids.length === 0) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guests")
    .select("id, display_name, phone, email, tags, identity_status, created_at, updated_at")
    .in("id", ids);

  if (error) throw new Error(error.message);

  const rows = new Map(
    ((data ?? []) as GuestListSelectRow[]).map((row) => [row.id, row])
  );
  const profiles = await listGuestProfileSummaries(ids);

  return ids
    .map((id) => {
      const row = rows.get(id);
      if (!row) return null;
      const profile = profiles.get(id) ?? null;
      return {
        id: row.id,
        display_name: row.display_name,
        phone: row.phone,
        email: row.email,
        tags: parseGuestTags(row.tags),
        identity_status: (row.identity_status as GuestListItem["identity_status"]) ?? "draft",
        profile,
        created_at: row.created_at,
        updated_at: row.updated_at,
        booking_count: profile?.completed_stays ?? 0,
        last_stay_check_out: profile?.last_stay_check_out ?? null,
      };
    })
    .filter((guest): guest is GuestListItem => guest != null);
}

async function listGuestIdsForHighlights(limit = 8): Promise<{
  blacklist: string[];
  loyal: string[];
  recent: string[];
  rated: string[];
}> {
  const supabase = createAdminClient();

  const [blacklistRes, loyalRes, recentRes, ratedRes] = await Promise.all([
    supabase
      .from("guest_profiles")
      .select("guest_id")
      .eq("flag_level", "blacklist")
      .order("updated_at", { ascending: false })
      .limit(limit),
    supabase
      .from("guest_profiles")
      .select("guest_id")
      .or("loyalty_score.gte.65,completed_stays.gte.3")
      .order("loyalty_score", { ascending: false })
      .order("completed_stays", { ascending: false })
      .limit(limit),
    supabase
      .from("guests")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(limit),
    supabase
      .from("guest_profiles")
      .select("guest_id")
      .gt("review_count", 0)
      .order("stars_avg", { ascending: false })
      .order("review_count", { ascending: false })
      .limit(limit),
  ]);

  if (blacklistRes.error) throw new Error(blacklistRes.error.message);
  if (loyalRes.error) throw new Error(loyalRes.error.message);
  if (recentRes.error) throw new Error(recentRes.error.message);
  if (ratedRes.error) throw new Error(ratedRes.error.message);

  return {
    blacklist: ((blacklistRes.data ?? []) as { guest_id: string }[]).map(
      (row) => row.guest_id
    ),
    loyal: ((loyalRes.data ?? []) as { guest_id: string }[]).map(
      (row) => row.guest_id
    ),
    recent: ((recentRes.data ?? []) as { id: string }[]).map((row) => row.id),
    rated: ((ratedRes.data ?? []) as { guest_id: string }[]).map(
      (row) => row.guest_id
    ),
  };
}

async function searchGuestIdsByQueryWindow(input: {
  query: string;
  offset: number;
  limit: number;
}): Promise<{ ids: string[]; exhausted: boolean }> {
  const supabase = createAdminClient();
  const term = sanitizeGuestSearchTerm(input.query);
  if (!term) return { ids: [], exhausted: true };
  const windowEnd = input.offset + input.limit;

  const normalizedPhone = normalizePhone(term);
  const normalizedEmail = normalizeEmail(term);
  const exactIds = new Set<string>();

  if (normalizedPhone) {
    const { data, error } = await supabase
      .from("guests")
      .select("id")
      .eq("phone_normalized", normalizedPhone)
      .limit(Math.max(windowEnd, 1));
    if (error) throw new Error(error.message);
    for (const row of data ?? []) exactIds.add(String(row.id));
  }

  if (normalizedEmail && !isPlaceholderEmail(normalizedEmail)) {
    const { data, error } = await supabase
      .from("guests")
      .select("id")
      .eq("email_normalized", normalizedEmail)
      .limit(Math.max(windowEnd, 1));
    if (error) throw new Error(error.message);
    for (const row of data ?? []) exactIds.add(String(row.id));
  }

  if (exactIds.size > 0) {
    const ids = [...exactIds];
    return {
      ids: ids.slice(input.offset, windowEnd),
      exhausted: ids.length <= windowEnd,
    };
  }

  const buildIdList = (rows: { id: string }[] | null | undefined) =>
    [...new Set((rows ?? []).map((row) => String(row.id)))];

  if (!normalizedPhone && !normalizedEmail && term.length < 2) {
    return { ids: [], exhausted: true };
  }

  if (term.includes("@")) {
    const { data, error } = await supabase
      .from("guests")
      .select("id")
      .ilike("email", `${term}%`)
      .order("display_name", { ascending: true })
      .range(input.offset, windowEnd);
    if (error) throw new Error(error.message);
    const ids = buildIdList(data as { id: string }[] | null);
    return { ids: ids.slice(0, input.limit), exhausted: ids.length <= input.limit };
  }

  if (normalizedPhone || /\d{4,}/.test(term)) {
    const phoneQuery = normalizedPhone ?? term.replace(/\D/g, "");
    const { data, error } = await supabase
      .from("guests")
      .select("id")
      .ilike("phone", `%${phoneQuery}%`)
      .order("display_name", { ascending: true })
      .range(input.offset, windowEnd);
    if (error) throw new Error(error.message);
    const ids = buildIdList(data as { id: string }[] | null);
    return { ids: ids.slice(0, input.limit), exhausted: ids.length <= input.limit };
  }

  const namePattern = term.length < 3 ? `${term}%` : `%${term}%`;
  const { data, error } = await supabase
    .from("guests")
    .select("id")
    .or(
      [
        `display_name.ilike.${namePattern}`,
        `email.ilike.${namePattern}`,
        `phone.ilike.${namePattern}`,
      ].join(",")
    )
    .order("display_name", { ascending: true })
    .range(input.offset, windowEnd);
  if (error) throw new Error(error.message);

  const ids = buildIdList(data as { id: string }[] | null);
  return { ids: ids.slice(0, input.limit), exhausted: ids.length <= input.limit };
}

async function listGuestIdsByFilter(
  filter: GuestSearchFilter,
  page: number,
  pageSize: number
): Promise<{ ids: string[]; hasMore: boolean }> {
  const supabase = createAdminClient();
  const offset = (page - 1) * pageSize;
  const to = offset + pageSize;

  if (filter === "recent" || filter === "all") {
    const { data, error } = await supabase
      .from("guests")
      .select("id")
      .order("updated_at", { ascending: false })
      .range(offset, to);
    if (error) throw new Error(error.message);
    const ids = ((data ?? []) as { id: string }[]).map((row) => row.id);
    return { ids: ids.slice(0, pageSize), hasMore: ids.length > pageSize };
  }

  let query = supabase.from("guest_profiles").select("guest_id");
  if (filter === "flagged") {
    query = query.in("flag_level", ["watchlist", "blacklist"]).order("updated_at", {
      ascending: false,
    });
  } else if (filter === "blacklist") {
    query = query.eq("flag_level", "blacklist").order("updated_at", {
      ascending: false,
    });
  } else if (filter === "watchlist") {
    query = query.eq("flag_level", "watchlist").order("updated_at", {
      ascending: false,
    });
  } else if (filter === "rated") {
    query = query
      .gt("review_count", 0)
      .order("stars_avg", { ascending: false })
      .order("review_count", { ascending: false });
  } else if (filter === "unreviewed") {
    query = query.eq("review_count", 0).order("updated_at", { ascending: false });
  } else if (filter === "loyal") {
    query = query
      .or("loyalty_score.gte.65,completed_stays.gte.3")
      .order("loyalty_score", { ascending: false })
      .order("completed_stays", { ascending: false });
  }

  const { data, error } = await query.range(offset, to);
  if (error) throw new Error(error.message);

  const ids = ((data ?? []) as { guest_id: string }[]).map((row) => row.guest_id);
  return { ids: ids.slice(0, pageSize), hasMore: ids.length > pageSize };
}

export async function listGuestHighlights(): Promise<GuestHighlights> {
  const { blacklist, loyal, recent, rated } = await listGuestIdsForHighlights(10);
  const [blacklistGuests, loyalGuests, recentGuests, ratedGuests] = await Promise.all([
    fetchGuestListItemsByIds(blacklist),
    fetchGuestListItemsByIds(loyal),
    fetchGuestListItemsByIds(recent),
    fetchGuestListItemsByIds(rated),
  ]);

  return {
    blacklist: blacklistGuests,
    loyal: loyalGuests,
    rated: ratedGuests,
    recent: recentGuests,
  };
}

export async function searchGuests(input: {
  query?: string;
  filter?: string;
  page?: number;
  pageSize?: number;
}): Promise<GuestSearchResult> {
  const query = input.query?.trim() ?? "";
  const filter = normalizeGuestFilter(input.filter);
  const page = normalizeGuestPage(input.page);
  const pageSize = Math.min(Math.max(input.pageSize ?? 20, 1), 50);
  const hasSearchCriteria = query.length > 0 || filter !== "all";

  if (!hasSearchCriteria) {
    return {
      items: [],
      query,
      filter,
      page,
      pageSize,
      hasMore: false,
      hasPrevious: false,
      mode: "highlights",
    };
  }

  if (!query) {
    const { ids, hasMore } = await listGuestIdsByFilter(filter, page, pageSize);
    const items = await fetchGuestListItemsByIds(ids);
    return {
      items,
      query,
      filter,
      page,
      pageSize,
      hasMore,
      hasPrevious: page > 1,
      mode: "results",
    };
  }

  const offset = (page - 1) * pageSize;
  const targetCount = offset + pageSize + 1;
  const batchSize = Math.min(100, Math.max(30, pageSize * 3));
  const filteredItems: GuestListItem[] = [];
  const seenIds = new Set<string>();
  let queryOffset = 0;
  let exhausted = false;

  while (!exhausted && filteredItems.length < targetCount) {
    const { ids, exhausted: batchExhausted } = await searchGuestIdsByQueryWindow({
      query,
      offset: queryOffset,
      limit: batchSize,
    });
    exhausted = batchExhausted;
    if (ids.length === 0) break;
    queryOffset += ids.length;

    const candidateItems = await fetchGuestListItemsByIds(ids);
    // When multiple similar profiles exist, keep riskier profiles first
    // so blacklist/watchlist guests are not hidden behind duplicates.
    candidateItems.sort((a, b) => {
      const byFlag =
        guestFlagRank(b.profile?.flag_level) - guestFlagRank(a.profile?.flag_level);
      if (byFlag !== 0) return byFlag;
      return b.updated_at.localeCompare(a.updated_at);
    });
    for (const guest of candidateItems) {
      if (seenIds.has(guest.id)) continue;
      seenIds.add(guest.id);
      if (matchesGuestFilter(guest, filter)) {
        filteredItems.push(guest);
        if (filteredItems.length >= targetCount) break;
      }
    }
  }

  const pagedItems = filteredItems.slice(offset, offset + pageSize);

  return {
    items: pagedItems,
    query,
    filter,
    page,
    pageSize,
    hasMore: filteredItems.length > offset + pageSize,
    hasPrevious: page > 1,
    mode: "results",
  };
}

export async function listGuests(query?: string): Promise<GuestListItem[]> {
  const result = await searchGuests({ query, page: 1, pageSize: 50 });
  return result.items;
}

async function listSegmentsForBookings(
  bookingIds: string[]
): Promise<Map<string, BookingRoomSegmentRow[]>> {
  const ids = [...new Set(bookingIds.filter(Boolean))];
  if (ids.length === 0) return new Map();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("booking_room_segments")
    .select("id, booking_id, room_id, segment_start, segment_end, nightly_rate")
    .in("booking_id", ids)
    .order("segment_start", { ascending: true });

  if (error) throw new Error(error.message);

  const grouped = new Map<string, BookingRoomSegmentRow[]>();
  for (const row of (data ?? []) as BookingRoomSegmentRow[]) {
    const current = grouped.get(row.booking_id) ?? [];
    current.push(row);
    grouped.set(row.booking_id, current);
  }
  return grouped;
}

export type GuestBookingHistoryItem = {
  id: string;
  check_in: string;
  check_out: string;
  status: BookingStatus;
  room_names: string[];
  total_price: number | null;
  num_adults: number;
  num_children: number;
  segments: BookingRoomSegmentRow[];
  review: GuestStayReviewRow | null;
};

export async function getGuestBookingHistory(
  guestId: string
): Promise<GuestBookingHistoryItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id, check_in, check_out, status, total_price, num_adults, num_children,
      booking_rooms ( room_id, rooms ( name ) )
    `
    )
    .eq("guest_id", guestId)
    .order("check_in", { ascending: false });

  if (error) throw new Error(error.message);

  const segmentsByBooking = await listSegmentsForBookings(
    (data ?? []).map((booking) => String(booking.id))
  );
  const reviews = await listGuestStayReviewsByBookingIds(
    (data ?? []).map((booking) => String(booking.id))
  );
  const items: GuestBookingHistoryItem[] = [];
  for (const b of data ?? []) {
    const br = (b.booking_rooms ?? []) as {
      room_id: string;
      rooms: { name: string } | { name: string }[] | null;
    }[];
    const room_names: string[] = [];
    for (const line of br) {
      const r = line.rooms;
      const name = Array.isArray(r) ? r[0]?.name : r?.name;
      if (name) room_names.push(name);
    }
    items.push({
      id: b.id as string,
      check_in: b.check_in as string,
      check_out: b.check_out as string,
      status: b.status as BookingStatus,
      room_names,
      total_price: b.total_price != null ? Number(b.total_price) : null,
      num_adults: b.num_adults as number,
      num_children: b.num_children as number,
      segments: segmentsByBooking.get(String(b.id)) ?? [],
      review: reviews.get(String(b.id)) ?? null,
    });
  }
  return items;
}

export type GuestIdentityInput = {
  doc_type: GuestDocType | null;
  doc_series: string | null;
  doc_number: string | null;
  doc_issued_by: string | null;
  doc_issue_date: string | null;
  doc_expiry_date: string | null;
  national_id_type: GuestNationalIdType | null;
  national_id: string | null;
  /** @deprecated kept for backward compat — synced from national_id when type=cnp */
  cnp: string | null;
  birth_date: string | null;
  birth_place: string | null;
  nationality: string | null;
  address: string | null;
  city: string | null;
  county: string | null;
  country: string | null;
  sex: GuestSex | null;
};

function computeIdentityStatus(input: GuestIdentityInput): GuestIdentityStatus {
  const hasDoc = input.doc_type != null && input.doc_number != null;
  const hasNationalId = input.national_id != null && input.national_id.length > 0;
  const hasCnp = input.cnp != null && input.cnp.length > 0;
  const hasBirthDate = input.birth_date != null;
  const hasNationality = input.nationality != null;
  const hasAddress = input.address != null;
  const hasSex = input.sex != null;

  const coreFields = [hasDoc, hasNationalId || hasCnp || hasBirthDate, hasNationality, hasSex];
  const filledCore = coreFields.filter(Boolean).length;

  if (filledCore === coreFields.length && hasAddress) return "complete";
  if (filledCore >= 1) return "partial";
  return "draft";
}

export async function updateGuestIdentity(
  guestId: string,
  input: GuestIdentityInput
): Promise<{ identityStatus: GuestIdentityStatus }> {
  const supabase = createAdminClient();
  const identityStatus = computeIdentityStatus(input);

  // Sync cnp field from national_id when type is cnp (backward compat)
  const cnpValue = input.national_id_type === "cnp"
    ? (input.national_id?.trim() || null)
    : (input.cnp?.trim() || null);

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
    .eq("id", guestId);

  if (error) throw new Error(error.message);

  await logAdminActivityFromSession({
    action: "guest.identity_updated",
    entityType: "guest",
    entityId: guestId,
    summary: `Date identitate actualizate → ${identityStatus}`,
    metadata: { identityStatus, docType: input.doc_type },
  });

  return { identityStatus };
}

/**
 * Find a guest by national ID (CNP, EGN, IDNP, AMKA, Személyi szám).
 * Searches both `national_id` and legacy `cnp` fields.
 */
export async function findGuestByNationalId(
  nationalId: string,
  excludeGuestId?: string
): Promise<GuestRow | null> {
  const cleaned = nationalId.replace(/[\s\-]/g, "");
  if (!cleaned) return null;

  const supabase = createAdminClient();

  // Search in both national_id and legacy cnp column
  let query = supabase
    .from("guests")
    .select("*")
    .or(`national_id.eq.${cleaned},cnp.eq.${cleaned}`)
    .limit(1)
    .maybeSingle();

  if (excludeGuestId) {
    query = supabase
      .from("guests")
      .select("*")
      .or(`national_id.eq.${cleaned},cnp.eq.${cleaned}`)
      .neq("id", excludeGuestId)
      .limit(1)
      .maybeSingle();
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ? mapGuestRow(data) : null;
}

/** @deprecated Use findGuestByNationalId */
export const findGuestByCnp = findGuestByNationalId;

export async function updateGuestNotes(
  guestId: string,
  notes: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("guests")
    .update({ notes: notes.trim() || null })
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
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("guests")
    .update({ tags })
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

export async function mergeGuests(
  sourceId: string,
  targetId: string
): Promise<void> {
  if (sourceId === targetId) {
    throw new Error("guest.select_different_guest_for_merge");
  }

  const supabase = createAdminClient();
  const [source, target] = await Promise.all([
    getGuestBaseById(sourceId),
    getGuestBaseById(targetId),
  ]);
  if (!source || !target) throw new Error("guest.not_found");

  const { error: moveErr } = await supabase
    .from("bookings")
    .update({ guest_id: targetId })
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

  const { error: updErr } = await supabase
    .from("guests")
    .update(patch)
    .eq("id", targetId);
  if (updErr) throw new Error(updErr.message);

  await mergeGuestProfiles(sourceId, targetId);

  const { error: delErr } = await supabase
    .from("guests")
    .delete()
    .eq("id", sourceId);
  if (delErr) throw new Error(delErr.message);

  await logAdminActivityFromSession({
    action: "guest.merged",
    entityType: "guest",
    entityId: targetId,
    summary: `Profil combinat: ${source.display_name} → ${target.display_name}`,
    metadata: { source_id: sourceId },
  });
}

async function estimateTotalForRooms(
  checkIn: string,
  checkOut: string,
  roomIds: string[]
): Promise<number | null> {
  if (roomIds.length === 0) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("price_per_night")
    .in("id", roomIds);
  if (error) throw new Error(error.message);
  const nights = stayNightCount(checkIn, checkOut);
  const raw = (data ?? []).reduce(
    (sum, r) => sum + Number(r.price_per_night) * nights,
    0
  );
  return Math.round(raw * 100) / 100;
}

async function getLastGuestBooking(guestId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id")
    .eq("guest_id", guestId)
    .neq("status", "anulata")
    .order("check_out", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return getBookingById(data.id);
}

export async function rebookGuestLastStay(guestId: string): Promise<string> {
  const guest = await getGuestBaseById(guestId);
  if (!guest) throw new Error("guest.not_found");

  const last = await getLastGuestBooking(guestId);
  if (!last) {
    throw new Error("guest.no_previous_stay_for_rebook");
  }

  const roomIds = last.room_ids;
  if (roomIds.length > 0) {
    await assertRoomsAvailableForStay(last.check_in, last.check_out, roomIds);
  }

  const total = await estimateTotalForRooms(
    last.check_in,
    last.check_out,
    roomIds
  );

  const bookingId = await createBookingRequest({
    check_in: last.check_in,
    check_out: last.check_out,
    guest_name: guest.display_name,
    guest_last_name: guest.last_name,
    guest_first_name: guest.first_name,
    guest_email: guest.email ?? last.guest_email,
    guest_phone: guest.phone ?? last.guest_phone ?? "",
    num_adults: last.num_adults,
    num_children: last.num_children,
    has_minor: last.has_minor,
    minor_age: last.minor_age ?? "",
    notes: `[Rebook] Ultimul sejur (${last.check_in} → ${last.check_out})`,
    total_price: total,
    room_ids: roomIds.length > 0 ? roomIds : undefined,
  });

  await logAdminActivityFromSession({
    action: "booking.rebooked",
    entityType: "booking",
    entityId: bookingId,
    summary: `Rebook ultimul sejur: ${guest.display_name}`,
    metadata: { guest_id: guestId, source_booking_id: last.id },
  });

  return bookingId;
}

export async function rebookGuestSamePeriodNextYear(
  guestId: string
): Promise<string> {
  const guest = await getGuestBaseById(guestId);
  if (!guest) throw new Error("guest.not_found");

  const last = await getLastGuestBooking(guestId);
  if (!last) {
    throw new Error("guest.no_previous_stay_for_rebook");
  }

  const shifted = shiftStayDatesByYears(last.check_in, last.check_out, 1);
  const roomIds = last.room_ids;

  if (roomIds.length > 0) {
    await assertRoomsAvailableForStay(
      shifted.check_in,
      shifted.check_out,
      roomIds
    );
  }

  const total = await estimateTotalForRooms(
    shifted.check_in,
    shifted.check_out,
    roomIds
  );

  const bookingId = await createBookingRequest({
    check_in: shifted.check_in,
    check_out: shifted.check_out,
    guest_name: guest.display_name,
    guest_last_name: guest.last_name,
    guest_first_name: guest.first_name,
    guest_email: guest.email ?? last.guest_email,
    guest_phone: guest.phone ?? last.guest_phone ?? "",
    num_adults: last.num_adults,
    num_children: last.num_children,
    has_minor: last.has_minor,
    minor_age: last.minor_age ?? "",
    notes: `[Rebook] Aceeași perioadă an viitor (din ${last.check_in})`,
    total_price: total,
    room_ids: roomIds.length > 0 ? roomIds : undefined,
  });

  await logAdminActivityFromSession({
    action: "booking.rebooked",
    entityType: "booking",
    entityId: bookingId,
    summary: `Rebook an viitor: ${guest.display_name}`,
    metadata: {
      guest_id: guestId,
      source_booking_id: last.id,
      check_in: shifted.check_in,
      check_out: shifted.check_out,
    },
  });

  return bookingId;
}

export async function findDuplicateGuestsForGuest(
  guestId: string
): Promise<GuestListItem[]> {
  const guest = await getGuestBaseById(guestId);
  if (!guest) return [];

  const supabase = createAdminClient();
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

export function guestInputFromNames(
  lastName: string,
  firstName: string,
  email: string,
  phone: string
): GuestBookingInput {
  return {
    guest_last_name: lastName,
    guest_first_name: firstName,
    guest_name: formatGuestFullName(lastName, firstName),
    guest_email: email,
    guest_phone: phone,
  };
}
