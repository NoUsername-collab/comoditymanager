import { cache } from "react";
import { unstable_cache } from "next/cache";
import { formatGuestFullName } from "@/domain/guest-name";
import {
  shiftStayDatesByYears,
  shiftStayToNextFutureYear,
} from "@/domain/guest/rebook-dates";
import { isReturningGuest } from "@/domain/guest/reputation";
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
import { createPublicAdminClient } from "@/lib/supabase/admin";
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
import { getGuestBaseById } from "./lookup";

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
    case "returning":
    case "loyal":
      return filter === "loyal" ? "returning" : filter;
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

function returningGuestProfileFilter(): string {
  const recentCutoff = isoDaysAgo(365);
  return `completed_stays.gte.3,total_nights.gte.10,and(completed_stays.gte.2,last_stay_check_out.gte.${recentCutoff})`;
}

function matchesGuestFilter(
  guest: GuestListItem,
  filter: GuestSearchFilter
): boolean {
  const profile = guest.profile;
  if (filter === "all") return true;
  if (filter === "flagged") return !!profile && profile.flag_level !== "normal";
  if (filter === "blacklist") return profile?.flag_level === "blacklist";
  if (filter === "watchlist") return profile?.flag_level === "watchlist";
  if (filter === "rated") return (profile?.review_count ?? 0) > 0;
  if (filter === "unreviewed") return (profile?.review_count ?? 0) === 0;
  if (filter === "returning") {
    if (!profile) return false;
    return isReturningGuest({
      completed_stays: profile.completed_stays,
      total_nights: profile.total_nights,
      last_stay_check_out: profile.last_stay_check_out,
    });
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

  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("guests")
    .select("id, display_name, phone, email, tags, identity_status, created_at, updated_at")
    .eq("tenant_id", tenantId)
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

async function listGuestIdsForHighlightsUncached(
  tenantId: string,
  limit = 8
): Promise<{
  blacklist: string[];
  returning: string[];
  recent: string[];
  rated: string[];
}> {
  const supabase = createPublicAdminClient();

  const [blacklistRes, returningRes, recentRes, ratedRes] = await Promise.all([
    supabase
      .from("guest_profiles")
      .select("guest_id")
      .eq("tenant_id", tenantId)
      .eq("flag_level", "blacklist")
      .order("updated_at", { ascending: false })
      .limit(limit),
    supabase
      .from("guest_profiles")
      .select("guest_id")
      .eq("tenant_id", tenantId)
      .or(returningGuestProfileFilter())
      .order("completed_stays", { ascending: false })
      .order("total_nights", { ascending: false })
      .limit(limit),
    supabase
      .from("guests")
      .select("id")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .limit(limit),
    supabase
      .from("guest_profiles")
      .select("guest_id")
      .eq("tenant_id", tenantId)
      .gt("review_count", 0)
      .order("stars_avg", { ascending: false })
      .order("review_count", { ascending: false })
      .limit(limit),
  ]);

  if (blacklistRes.error) throw new Error(blacklistRes.error.message);
  if (returningRes.error) throw new Error(returningRes.error.message);
  if (recentRes.error) throw new Error(recentRes.error.message);
  if (ratedRes.error) throw new Error(ratedRes.error.message);

  return {
    blacklist: ((blacklistRes.data ?? []) as { guest_id: string }[]).map(
      (row) => row.guest_id
    ),
    returning: ((returningRes.data ?? []) as { guest_id: string }[]).map(
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
  const { tenantId, supabase } = await getTenantScope();
  const term = sanitizeGuestSearchTerm(input.query);
  if (!term) return { ids: [], exhausted: true };
  const windowEnd = input.offset + input.limit;

  const normalizedPhone = normalizePhone(term);
  const normalizedEmail = normalizeEmail(term);
  const exactIds = new Set<string>();

  if (normalizedPhone) {
    const phoneQuery = supabase
      .from("guests")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("phone_normalized", normalizedPhone)
      .limit(Math.max(windowEnd, 1));
    const emailQuery =
      normalizedEmail && !isPlaceholderEmail(normalizedEmail)
        ? supabase
            .from("guests")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("email_normalized", normalizedEmail)
            .limit(Math.max(windowEnd, 1))
        : null;

    const [phoneRes, emailRes] = await Promise.all([
      phoneQuery,
      emailQuery ?? Promise.resolve({ data: null, error: null }),
    ]);
    if (phoneRes.error) throw new Error(phoneRes.error.message);
    if (emailRes.error) throw new Error(emailRes.error.message);
    for (const row of phoneRes.data ?? []) exactIds.add(String(row.id));
    for (const row of emailRes.data ?? []) exactIds.add(String(row.id));
  } else if (normalizedEmail && !isPlaceholderEmail(normalizedEmail)) {
    const { data, error } = await supabase
      .from("guests")
      .select("id")
      .eq("tenant_id", tenantId)
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
      .eq("tenant_id", tenantId)
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
      .eq("tenant_id", tenantId)
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
    .eq("tenant_id", tenantId)
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
  const { tenantId, supabase } = await getTenantScope();
  const offset = (page - 1) * pageSize;
  const to = offset + pageSize;

  if (filter === "recent" || filter === "all") {
    const { data, error } = await supabase
      .from("guests")
      .select("id")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .range(offset, to);
    if (error) throw new Error(error.message);
    const ids = ((data ?? []) as { id: string }[]).map((row) => row.id);
    return { ids: ids.slice(0, pageSize), hasMore: ids.length > pageSize };
  }

  let query = supabase
    .from("guest_profiles")
    .select("guest_id")
    .eq("tenant_id", tenantId);
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
  } else if (filter === "returning") {
    query = query
      .or(returningGuestProfileFilter())
      .order("completed_stays", { ascending: false })
      .order("total_nights", { ascending: false });
  }

  const { data, error } = await query.range(offset, to);
  if (error) throw new Error(error.message);

  const ids = ((data ?? []) as { guest_id: string }[]).map((row) => row.guest_id);
  return { ids: ids.slice(0, pageSize), hasMore: ids.length > pageSize };
}

async function loadGuestHighlightsForTenant(tenantId: string): Promise<GuestHighlights> {
  const { blacklist, returning, recent, rated } =
    await listGuestIdsForHighlightsUncached(tenantId, 10);
  const allIds = [...new Set([...blacklist, ...returning, ...recent, ...rated])];
  const guestsById = new Map(
    (await fetchGuestListItemsByIds(allIds)).map((guest) => [guest.id, guest] as const),
  );
  const pick = (ids: string[]) =>
    ids.map((id) => guestsById.get(id)).filter((guest): guest is GuestListItem => !!guest);

  return {
    blacklist: pick(blacklist),
    returning: pick(returning),
    rated: pick(rated),
    recent: pick(recent),
  };
}

const getCachedGuestHighlights = (tenantId: string) =>
  unstable_cache(
    () => loadGuestHighlightsForTenant(tenantId),
    ["guest-highlights", tenantId],
    {
      tags: [`tenant-${tenantId}-guest-highlights`],
      revalidate: 60,
    }
  );

const loadGuestHighlights = cache(async (): Promise<GuestHighlights> => {
  const { tenantId } = await getTenantScope();
  return getCachedGuestHighlights(tenantId)();
});

export async function listGuestHighlights(): Promise<GuestHighlights> {
  return loadGuestHighlights();
}

const loadSearchGuests = cache(async (
  query: string,
  filter: GuestSearchFilter,
  page: number,
  pageSize: number
): Promise<GuestSearchResult> => {
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
});

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
  return loadSearchGuests(query, filter, page, pageSize);
}

export async function listGuests(query?: string): Promise<GuestListItem[]> {
  const result = await searchGuests({ query, page: 1, pageSize: 50 });
  return result.items;
}

