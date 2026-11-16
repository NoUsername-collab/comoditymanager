import type { SupabaseClient } from "@supabase/supabase-js";
import { APP_VERSION, BUILD_SHA } from "@/lib/platform/version";
import { createPublicAdminClient } from "@/lib/supabase/admin";

/*
 * Daily backups per property, as one JSON file in the private "backups"
 * bucket: tenants/<slug>/backup-<time>.json, the last 30 kept. The cron runs
 * every hour and backs up the properties whose last backup is oldest, as many
 * as fit in its time, so any number of properties is backed up once a day.
 */

const BACKUP_BUCKET = "backups";
const MAX_BACKUP_FILES_PER_TENANT = 30;
/** A property is due again this long after its last backup. */
const BACKUP_INTERVAL_MS = 20 * 60 * 60 * 1000;
const ACTIVITY_DAYS = 90;
/** The API returns at most 1,000 rows per request; tables are read in pages of this size. */
const PAGE_SIZE = 1000;

/** Tables backed up, with the key that orders them for stable pages. */
const BACKUP_TABLES: { table: string; key: string }[] = [
  { table: "pension_settings", key: "id" },
  { table: "buildings", key: "id" },
  { table: "floors", key: "id" },
  { table: "rooms", key: "id" },
  { table: "room_type_definitions", key: "id" },
  { table: "room_option_definitions", key: "id" },
  { table: "bookings", key: "id" },
  { table: "booking_rooms", key: "id" },
  { table: "booking_room_segments", key: "id" },
  { table: "booking_occupants", key: "id" },
  { table: "booking_invoices", key: "id" },
  { table: "booking_payments", key: "id" },
  { table: "checkins", key: "id" },
  { table: "checkin_guests", key: "id" },
  { table: "room_blocks", key: "id" },
  { table: "room_holds", key: "id" },
  { table: "room_ical_feeds", key: "id" },
  { table: "guests", key: "id" },
  { table: "guest_profiles", key: "guest_id" },
  { table: "guest_stay_reviews", key: "booking_id" },
  { table: "guest_app_settings", key: "tenant_id" },
  { table: "public_site_settings", key: "id" },
  { table: "public_site_sections", key: "id" },
  { table: "public_site_pages", key: "id" },
  { table: "media_assets", key: "id" },
];

/** Every row of one table for one property, page by page. */
async function readAllRows(
  supabase: SupabaseClient,
  table: string,
  key: string,
  tenantId: string,
  since?: { column: string; value: string },
): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table).select("*").eq("tenant_id", tenantId);
    if (since) query = query.gte(since.column, since.value);
    const { data, error } = await query
      .order(key, { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

export type TenantBackupResult = {
  slug: string;
  ok: boolean;
  sizeKB?: number;
  rows?: number;
  error?: string;
};

async function backupTenant(
  supabase: SupabaseClient,
  tenant: { id: string; slug: string },
): Promise<TenantBackupResult> {
  const data: Record<string, unknown[]> = {};
  let rows = 0;
  for (const { table, key } of BACKUP_TABLES) {
    data[table] = await readAllRows(supabase, table, key, tenant.id);
    rows += data[table].length;
  }
  const activitySince = new Date(Date.now() - ACTIVITY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  data.admin_activity_log = await readAllRows(supabase, "admin_activity_log", "id", tenant.id, {
    column: "created_at",
    value: activitySince,
  });
  rows += data.admin_activity_log.length;

  const now = new Date();
  const body = JSON.stringify({
    meta: {
      version: "3.0",
      tenant_id: tenant.id,
      tenant_slug: tenant.slug,
      created_at: now.toISOString(),
      app_version: APP_VERSION,
      build: BUILD_SHA,
      tables: [...BACKUP_TABLES.map((t) => t.table), "admin_activity_log"],
      rows,
    },
    data,
  });
  const folder = `tenants/${tenant.slug}`;
  const { error: uploadError } = await supabase.storage
    .from(BACKUP_BUCKET)
    .upload(`${folder}/backup-${now.toISOString().replace(/[:.]/g, "-")}.json`, body, {
      contentType: "application/json",
      upsert: false,
    });
  if (uploadError) throw new Error(uploadError.message);

  const { error: markError } = await supabase
    .from("tenants")
    .update({ last_backup_at: now.toISOString() })
    .eq("id", tenant.id);
  if (markError) throw new Error(markError.message);

  // Keep the newest files only.
  const { data: files } = await supabase.storage
    .from(BACKUP_BUCKET)
    .list(folder, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
  const old = (files ?? [])
    .slice(MAX_BACKUP_FILES_PER_TENANT)
    .map((file) => `${folder}/${file.name}`);
  if (old.length > 0) await supabase.storage.from(BACKUP_BUCKET).remove(old);

  return { slug: tenant.slug, ok: true, sizeKB: Math.round(body.length / 1024), rows };
}

/**
 * Backs up the properties that are due, oldest backup first, until the time
 * budget is spent; the rest wait for the next hourly run.
 */
export async function runDueTenantBackups(
  budgetMs: number,
): Promise<{ due: number; results: TenantBackupResult[] }> {
  const started = Date.now();
  const supabase = createPublicAdminClient();
  const dueBefore = new Date(Date.now() - BACKUP_INTERVAL_MS).toISOString();
  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("id, slug")
    .in("status", ["active", "trial"])
    .or(`last_backup_at.is.null,last_backup_at.lt.${dueBefore}`)
    .order("last_backup_at", { ascending: true, nullsFirst: true })
    .limit(200);
  if (error) throw new Error(error.message);

  await supabase.storage
    .createBucket(BACKUP_BUCKET, { public: false, fileSizeLimit: 50 * 1024 * 1024 })
    .catch(() => undefined);

  const results: TenantBackupResult[] = [];
  for (const tenant of tenants ?? []) {
    if (Date.now() - started > budgetMs) break;
    try {
      results.push(await backupTenant(supabase, tenant as { id: string; slug: string }));
    } catch (e) {
      results.push({
        slug: tenant.slug as string,
        ok: false,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }
  return { due: tenants?.length ?? 0, results };
}
