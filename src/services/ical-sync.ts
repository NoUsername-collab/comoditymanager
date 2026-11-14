import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlanConfig } from "@/core/config/plans";
import { looksLikeIcal, parseIcalEvents } from "@/domain/ical/parse";
import { buildIcalCalendar, type IcalExportEvent } from "@/domain/ical/generate";
import { countImportConflicts, planIcalSync, type ImportedBlock } from "@/domain/ical/sync-plan";
import { normalizeIcalFeedUrl } from "@/domain/ical/feed-url";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { getTenantScope, withTenantId } from "@/lib/tenant/scope";
import { addDays, todayIso } from "@/lib/stay-dates";
import { getRoomOccupancy } from "@/services/room-occupancy";

/*
 * Calendar sync with other sites (Booking.com, Airbnb…), per room.
 * Export: the room's secret address lists the nights taken in Zalmox.
 * Import: each feed's reservations become blocks on the room.
 */

/** Longest a calendar may take to answer, and the largest one read. */
const FETCH_TIMEOUT_MS = 15_000;
const MAX_FEED_BYTES = 2 * 1024 * 1024;
/** How far ahead the export reaches; sites read about a year. */
const EXPORT_DAYS_AHEAD = 2 * 365;
const EXPORT_DAYS_BEHIND = 30;

export type RoomIcalFeed = {
  id: string;
  roomId: string;
  name: string;
  url: string;
  lastSyncedAt: string | null;
  lastStatus: "ok" | "error" | null;
  lastError: string | null;
  lastEventCount: number | null;
  lastConflictCount: number | null;
};

type FeedRow = {
  id: string;
  tenant_id: string;
  room_id: string;
  name: string;
  url: string;
  last_synced_at: string | null;
  last_status: "ok" | "error" | null;
  last_error: string | null;
  last_event_count: number | null;
  last_conflict_count: number | null;
};

const FEED_COLUMNS =
  "id, tenant_id, room_id, name, url, last_synced_at, last_status, last_error, last_event_count, last_conflict_count";

function mapFeed(row: FeedRow): RoomIcalFeed {
  return {
    id: row.id,
    roomId: row.room_id,
    name: row.name,
    url: row.url,
    lastSyncedAt: row.last_synced_at,
    lastStatus: row.last_status,
    lastError: row.last_error,
    lastEventCount: row.last_event_count,
    lastConflictCount: row.last_conflict_count,
  };
}

/** Whether a plan (plus modules switched on by hand) includes calendar sync. */
export function tenantHasIcalSync(planId: string, activeModules: readonly string[] | null): boolean {
  return (
    getPlanConfig(planId).includedModules.includes("ical_sync") ||
    (activeModules ?? []).includes("ical_sync")
  );
}

// ── Export ────────────────────────────────────────────────────────────────

/**
 * The room's calendar for the address in its secret token, or null when the
 * token is unknown, the property is not active or its plan has no calendar
 * sync. Blocks imported from other sites are left out: they belong to those
 * sites, and sending them back would keep a cancelled reservation alive.
 */
export async function buildRoomIcalExport(token: string): Promise<{ ics: string } | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const supabase = createPublicAdminClient();
  // cross-tenant by secret token: the address works on any host, and the token is the room's secret.
  const { data: room, error } = await supabase
    .from("rooms")
    .select("id, tenant_id, name")
    .eq("ical_export_token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!room) return null;

  const tenantId = room.tenant_id as string;
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("display_name, plan_id, active_modules, status")
    .eq("id", tenantId)
    .maybeSingle();
  if (tenantError) throw new Error(tenantError.message);
  if (!tenant || tenant.status === "suspended" || tenant.status === "cancelled") return null;
  if (!tenantHasIcalSync(tenant.plan_id as string, tenant.active_modules as string[] | null)) return null;

  const today = todayIso();
  const from = addDays(today, -EXPORT_DAYS_BEHIND);
  const to = addDays(today, EXPORT_DAYS_AHEAD);
  const roomId = room.id as string;

  const [segments, blocksResult] = await Promise.all([
    getRoomOccupancy(from, to, {
      tenantId,
      roomIds: [roomId],
      kinds: ["hold", "request", "stay"],
      referenceDate: today,
    }),
    supabase
      .from("room_blocks")
      .select("id, check_in, check_out")
      .eq("tenant_id", tenantId)
      .eq("room_id", roomId)
      .is("ical_feed_id", null)
      .gte("check_out", from)
      .lte("check_in", to),
  ]);
  if (blocksResult.error) throw new Error(blocksResult.error.message);

  const events: IcalExportEvent[] = [
    ...segments.map((s) => ({ uid: `${s.kind}-${s.id}@zalmox`, checkIn: s.checkIn, checkOut: s.checkOut })),
    ...(blocksResult.data ?? []).map((b) => ({
      uid: `block-${b.id as string}@zalmox`,
      checkIn: b.check_in as string,
      checkOut: b.check_out as string,
    })),
  ].sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  return {
    ics: buildIcalCalendar({
      calendarName: `${tenant.display_name as string} · ${room.name as string}`,
      summary: "Zalmox",
      events,
    }),
  };
}

// ── Feeds, for staff ─────────────────────────────────────────────────────

export type RoomIcalOverview = {
  roomId: string;
  roomName: string;
  buildingName: string | null;
  exportToken: string;
  feeds: RoomIcalFeed[];
};

/** Every room with its export token and the calendars it imports. */
export async function listRoomIcalOverview(): Promise<RoomIcalOverview[]> {
  const { tenantId, supabase } = await getTenantScope();
  const [roomsResult, feedsResult] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name, ical_export_token, sort_order, buildings(name)")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("room_ical_feeds")
      .select(FEED_COLUMNS)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true }),
  ]);
  if (roomsResult.error) throw new Error(roomsResult.error.message);
  if (feedsResult.error) throw new Error(feedsResult.error.message);

  const feedsByRoom = new Map<string, RoomIcalFeed[]>();
  for (const row of (feedsResult.data ?? []) as FeedRow[]) {
    const list = feedsByRoom.get(row.room_id) ?? [];
    list.push(mapFeed(row));
    feedsByRoom.set(row.room_id, list);
  }
  const rooms = (roomsResult.data ?? []).map((row) => {
    const building = row.buildings as { name?: string } | { name?: string }[] | null;
    const buildingName = Array.isArray(building) ? building[0]?.name : building?.name;
    return {
      roomId: row.id as string,
      roomName: row.name as string,
      buildingName: buildingName ?? null,
      exportToken: row.ical_export_token as string,
      feeds: feedsByRoom.get(row.id as string) ?? [],
      sortOrder: (row.sort_order as number | null) ?? 0,
    };
  });
  // By building, then the house's own order, then the room number as a number (2 before 10).
  const collator = new Intl.Collator("ro", { numeric: true, sensitivity: "base" });
  rooms.sort(
    (a, b) =>
      collator.compare(a.buildingName ?? "", b.buildingName ?? "") ||
      a.sortOrder - b.sortOrder ||
      collator.compare(a.roomName, b.roomName),
  );
  return rooms.map(({ sortOrder: _sortOrder, ...room }) => room);
}

export type AddFeedError = "invalid_url" | "not_https" | "private_host" | "duplicate" | "room_not_found" | "name_required";

export async function addRoomIcalFeed(input: {
  roomId: string;
  name: string;
  url: string;
}): Promise<{ ok: true; feedId: string } | { ok: false; error: AddFeedError }> {
  const normalized = normalizeIcalFeedUrl(input.url);
  if (!normalized.ok) return { ok: false, error: normalized.error };
  const name = input.name.trim().slice(0, 60);
  if (!name) return { ok: false, error: "name_required" };

  const { tenantId, supabase } = await getTenantScope();
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", input.roomId)
    .maybeSingle();
  if (roomError) throw new Error(roomError.message);
  if (!room) return { ok: false, error: "room_not_found" };

  const { data, error } = await supabase
    .from("room_ical_feeds")
    .insert(withTenantId(tenantId, { room_id: input.roomId, name, url: normalized.url }))
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, error: "duplicate" };
    throw new Error(error.message);
  }
  return { ok: true, feedId: data.id as string };
}

/** Removes the feed and the blocks it brought in. */
export async function removeRoomIcalFeed(feedId: string): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  const { error } = await supabase
    .from("room_ical_feeds")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", feedId);
  if (error) throw new Error(error.message);
}

/** A new export address for the room; sites reading the old one stop seeing it. */
export async function rotateRoomIcalExportToken(roomId: string): Promise<string> {
  const { tenantId, supabase } = await getTenantScope();
  const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
  const { data, error } = await supabase
    .from("rooms")
    .update({ ical_export_token: token })
    .eq("tenant_id", tenantId)
    .eq("id", roomId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("rooms.not_found");
  return token;
}

// ── Import ───────────────────────────────────────────────────────────────

export type FeedSyncResult = {
  feedId: string;
  tenantId: string;
  ok: boolean;
  changed: boolean;
  error?: string;
};

/** The calendar's text, or a short reason it could not be read. */
async function fetchFeedText(url: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "text/calendar, text/plain;q=0.9, */*;q=0.1", "User-Agent": "Zalmox-Calendar-Sync/1.0" },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return { ok: false, error: timedOut ? "ical.timeout" : "ical.unreachable" };
  }
  // A redirect may not lead into the server's own network either.
  if (!normalizeIcalFeedUrl(response.url || url).ok) return { ok: false, error: "ical.unreachable" };
  if (response.status === 404 || response.status === 410) return { ok: false, error: "ical.not_found" };
  if (response.status === 401 || response.status === 403) return { ok: false, error: "ical.forbidden" };
  if (!response.ok) return { ok: false, error: "ical.http_error" };

  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_FEED_BYTES) return { ok: false, error: "ical.too_large" };
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_FEED_BYTES) return { ok: false, error: "ical.too_large" };
  const text = new TextDecoder("utf-8").decode(buffer);
  if (!looksLikeIcal(text)) return { ok: false, error: "ical.not_a_calendar" };
  return { ok: true, text };
}

async function syncFeed(supabase: SupabaseClient, feed: FeedRow): Promise<FeedSyncResult> {
  const base = { feedId: feed.id, tenantId: feed.tenant_id };
  const now = new Date().toISOString();
  const fetched = await fetchFeedText(feed.url);
  if (!fetched.ok) {
    // The blocks stay as they were: a calendar that did not answer cancels nothing.
    await supabase
      .from("room_ical_feeds")
      .update({ last_synced_at: now, last_status: "error", last_error: fetched.error })
      .eq("tenant_id", feed.tenant_id)
      .eq("id", feed.id);
    return { ...base, ok: false, changed: false, error: fetched.error };
  }

  const events = parseIcalEvents(fetched.text);
  const today = todayIso();
  const { data: existingRows, error: existingError } = await supabase
    .from("room_blocks")
    .select("id, ical_uid, check_in, check_out, reason")
    .eq("tenant_id", feed.tenant_id)
    .eq("ical_feed_id", feed.id);
  if (existingError) throw new Error(existingError.message);
  const existing: ImportedBlock[] = (existingRows ?? []).map((row) => ({
    id: row.id as string,
    uid: row.ical_uid as string,
    checkIn: row.check_in as string,
    checkOut: row.check_out as string,
    reason: row.reason as string,
  }));

  const plan = planIcalSync({ feedName: feed.name, events, existing, today });
  if (plan.remove.length > 0) {
    const { error } = await supabase
      .from("room_blocks")
      .delete()
      .eq("tenant_id", feed.tenant_id)
      .eq("ical_feed_id", feed.id)
      .in("id", plan.remove);
    if (error) throw new Error(error.message);
  }
  for (const change of plan.update) {
    const { error } = await supabase
      .from("room_blocks")
      .update({ check_in: change.checkIn, check_out: change.checkOut, reason: change.reason })
      .eq("tenant_id", feed.tenant_id)
      .eq("id", change.id);
    if (error) throw new Error(error.message);
  }
  if (plan.insert.length > 0) {
    const { error } = await supabase.from("room_blocks").insert(
      plan.insert.map((row) =>
        withTenantId(feed.tenant_id, {
          room_id: feed.room_id,
          check_in: row.checkIn,
          check_out: row.checkOut,
          reason: row.reason,
          created_by: "ical",
          ical_feed_id: feed.id,
          ical_uid: row.uid,
        }),
      ),
    );
    if (error) throw new Error(error.message);
  }

  // Reservations the other site sold on nights Zalmox already gave away.
  const upcoming = events.filter((e) => e.checkOut > today);
  let conflicts = 0;
  if (upcoming.length > 0) {
    const last = upcoming.reduce((max, e) => (e.checkOut > max ? e.checkOut : max), today);
    const taken = await getRoomOccupancy(today, last, {
      tenantId: feed.tenant_id,
      roomIds: [feed.room_id],
      kinds: ["hold", "request", "stay"],
      referenceDate: today,
    });
    conflicts = countImportConflicts(upcoming, taken);
  }

  await supabase
    .from("room_ical_feeds")
    .update({
      last_synced_at: now,
      last_status: "ok",
      last_error: null,
      last_event_count: upcoming.length,
      last_conflict_count: conflicts,
    })
    .eq("tenant_id", feed.tenant_id)
    .eq("id", feed.id);

  const changed = plan.insert.length + plan.update.length + plan.remove.length > 0;
  return { ...base, ok: true, changed };
}

/** Syncs every feed of the signed-in staff member's property now. */
export async function syncTenantIcalFeedsNow(): Promise<FeedSyncResult[]> {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("room_ical_feeds")
    .select(FEED_COLUMNS)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
  const results: FeedSyncResult[] = [];
  for (const feed of (data ?? []) as FeedRow[]) {
    results.push(await syncFeed(supabase, feed));
  }
  return results;
}

/**
 * The scheduled sync: the feeds waiting longest first, a batch per run, only
 * for properties whose plan includes calendar sync and that are active.
 */
export async function syncDueIcalFeeds(limit = 40): Promise<FeedSyncResult[]> {
  const supabase = createPublicAdminClient();
  // cross-tenant cron batch — each feed row carries tenant_id, used on every write
  const { data, error } = await supabase
    .from("room_ical_feeds")
    .select(`${FEED_COLUMNS}, tenants!inner(plan_id, active_modules, status)`)
    .in("tenants.status", ["active", "trial"])
    .order("last_synced_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  const results: FeedSyncResult[] = [];
  for (const row of data ?? []) {
    const tenant = row.tenants as unknown as { plan_id: string; active_modules: string[] | null };
    if (!tenantHasIcalSync(tenant.plan_id, tenant.active_modules)) continue;
    try {
      results.push(await syncFeed(supabase, row as unknown as FeedRow));
    } catch (e) {
      console.error("[ical-sync] feed failed", row.id, e);
      results.push({ feedId: row.id as string, tenantId: row.tenant_id as string, ok: false, changed: false, error: "ical.internal" });
    }
  }
  return results;
}
