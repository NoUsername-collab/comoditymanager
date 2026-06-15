/**
 * GET /api/cron/backup
 *
 * Automated daily backup — exports data as JSON, isolated per tenant.
 * Triggered by Vercel Cron (vercel.json) every day at 03:00 UTC.
 *
 * Security: requires CRON_SECRET header (Vercel injects this automatically).
 *
 * What it backs up (per tenant):
 *   - pension_settings
 *   - buildings, floors, rooms
 *   - bookings, booking_rooms, booking_room_segments
 *   - guests, guest_profiles, guest_stay_reviews
 *   - admin_activity_log (last 90 days)
 *
 * Storage: Supabase Storage bucket "backups" → tenants/{slug}/backup-{ts}.json
 * Retention: 30 files per tenant (rolling), ~1 month of daily backups
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const BACKUP_BUCKET = "backups";
const MAX_BACKUP_FILES_PER_TENANT = 30;

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

const DATA_TABLES = [
  "pension_settings",
  "buildings",
  "floors",
  "rooms",
  "bookings",
  "booking_rooms",
  "booking_room_segments",
  "guests",
  "guest_profiles",
  "guest_stay_reviews",
] as const;

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ── Auth: Vercel Cron sends CRON_SECRET ──────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { createPublicAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createPublicAdminClient();

    // ── Get all active tenants ─────────────────────────────────────
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, slug, status")
      .in("status", ["active", "trial"]);

    if (tenantsError) {
      return NextResponse.json(
        { error: "Failed to list tenants", details: tenantsError.message },
        { status: 500 }
      );
    }

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ ok: true, message: "No active tenants", tenants: 0 });
    }

    // ── Ensure bucket exists ────────────────────────────────────────
    await supabase.storage
      .createBucket(BACKUP_BUCKET, {
        public: false,
        fileSizeLimit: 50 * 1024 * 1024,
      })
      .catch(() => {});

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const activityCutoff = new Date(Date.now() - NINETY_DAYS_MS).toISOString();
    const results: { slug: string; ok: boolean; sizeKB?: number; error?: string }[] = [];

    // ── Backup each tenant ──────────────────────────────────────────
    for (const tenant of tenants) {
      try {
        const tenantData: Record<string, unknown[]> = {};
        const errors: string[] = [];

        // Fetch all tenant-scoped tables in parallel
        const tableResults = await Promise.all(
          DATA_TABLES.map(async (table) => {
            const { data, error } = await supabase
              .from(table)
              .select("*")
              .eq("tenant_id", tenant.id);
            return { table, data, error };
          })
        );

        for (const { table, data, error } of tableResults) {
          if (error) {
            errors.push(`${table}: ${error.message}`);
          }
          tenantData[table] = data ?? [];
        }

        // Activity log — tenant-scoped + last 90 days
        const { data: activityData, error: activityError } = await supabase
          .from("admin_activity_log")
          .select("*")
          .eq("tenant_id", tenant.id)
          .gte("created_at", activityCutoff)
          .order("created_at", { ascending: false });

        if (activityError) {
          errors.push(`admin_activity_log: ${activityError.message}`);
        }
        tenantData.admin_activity_log = activityData ?? [];

        if (errors.length > 0) {
          results.push({ slug: tenant.slug, ok: false, error: errors.join("; ") });
          continue;
        }

        // Build tenant backup
        const backup = {
          meta: {
            version: "2.0",
            tenant_id: tenant.id,
            tenant_slug: tenant.slug,
            created_at: new Date().toISOString(),
            build: process.env.NEXT_PUBLIC_BUILD_SHA ?? "dev",
            tables: [...DATA_TABLES, "admin_activity_log"],
          },
          data: tenantData,
        };

        const jsonContent = JSON.stringify(backup, null, 0);
        const sizeKB = Math.round(jsonContent.length / 1024);
        const filePath = `tenants/${tenant.slug}/backup-${timestamp}.json`;

        // Upload
        const { error: uploadError } = await supabase.storage
          .from(BACKUP_BUCKET)
          .upload(filePath, jsonContent, {
            contentType: "application/json",
            upsert: false,
          });

        if (uploadError) {
          results.push({ slug: tenant.slug, ok: false, error: uploadError.message });
          continue;
        }

        // Cleanup old backups for this tenant
        const { data: fileList } = await supabase.storage
          .from(BACKUP_BUCKET)
          .list(`tenants/${tenant.slug}`, {
            limit: 200,
            sortBy: { column: "created_at", order: "desc" },
          });

        if (fileList && fileList.length > MAX_BACKUP_FILES_PER_TENANT) {
          const toDelete = fileList
            .slice(MAX_BACKUP_FILES_PER_TENANT)
            .map((f) => `tenants/${tenant.slug}/${f.name}`);
          if (toDelete.length > 0) {
            await supabase.storage.from(BACKUP_BUCKET).remove(toDelete);
          }
        }

        results.push({ slug: tenant.slug, ok: true, sizeKB });
      } catch (e) {
        results.push({
          slug: tenant.slug,
          ok: false,
          error: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }

    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    return NextResponse.json({
      ok: failed === 0,
      timestamp: new Date().toISOString(),
      tenants: tenants.length,
      succeeded,
      failed,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Backup failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
