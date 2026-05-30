/**
 * GET /api/cron/backup
 *
 * Automated daily backup — exports all critical data as JSON.
 * Triggered by Vercel Cron (vercel.json) every day at 03:00 UTC.
 *
 * Security: requires CRON_SECRET header (Vercel injects this automatically).
 *
 * What it backs up:
 *   - pension_settings
 *   - buildings, floors, rooms
 *   - bookings, booking_rooms, booking_room_segments
 *   - guests, guest_profiles, guest_stay_reviews
 *   - admin_activity_log (last 90 days)
 *
 * Storage: Supabase Storage bucket "backups"
 * Retention: 30 files (rolling), ~1 month of daily backups
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds max

const BACKUP_BUCKET = "backups";
const MAX_BACKUP_FILES = 30;

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ── Auth: Vercel Cron sends CRON_SECRET ──────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  try {
    const { createPublicAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createPublicAdminClient();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-${timestamp}.json`;

    // ── Export all tables ──────────────────────────────────────────
    const [
      settings,
      buildings,
      floors,
      rooms,
      bookings,
      bookingRooms,
      segments,
      guests,
      profiles,
      reviews,
      activityLog,
    ] = await Promise.all([
      supabase.from("pension_settings").select("*"),
      supabase.from("buildings").select("*"),
      supabase.from("floors").select("*"),
      supabase.from("rooms").select("*"),
      supabase.from("bookings").select("*"),
      supabase.from("booking_rooms").select("*"),
      supabase.from("booking_room_segments").select("*"),
      supabase.from("guests").select("*"),
      supabase.from("guest_profiles").select("*"),
      supabase.from("guest_stay_reviews").select("*"),
      supabase.from("admin_activity_log")
        .select("*")
        .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false }),
    ]);

    // Check for errors
    const errors: string[] = [];
    const tables = {
      pension_settings: settings,
      buildings,
      floors,
      rooms,
      bookings,
      booking_rooms: bookingRooms,
      booking_room_segments: segments,
      guests,
      guest_profiles: profiles,
      guest_stay_reviews: reviews,
      admin_activity_log: activityLog,
    };

    for (const [name, result] of Object.entries(tables)) {
      if (result.error) {
        errors.push(`${name}: ${result.error.message}`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Backup partially failed", details: errors },
        { status: 500 }
      );
    }

    // ── Build backup JSON ─────────────────────────────────────────
    const backup = {
      meta: {
        version: "1.0",
        created_at: new Date().toISOString(),
        build: process.env.NEXT_PUBLIC_BUILD_SHA ?? "dev",
        tables: Object.keys(tables),
      },
      data: {
        pension_settings: settings.data ?? [],
        buildings: buildings.data ?? [],
        floors: floors.data ?? [],
        rooms: rooms.data ?? [],
        bookings: bookings.data ?? [],
        booking_rooms: bookingRooms.data ?? [],
        booking_room_segments: segments.data ?? [],
        guests: guests.data ?? [],
        guest_profiles: profiles.data ?? [],
        guest_stay_reviews: reviews.data ?? [],
        admin_activity_log: activityLog.data ?? [],
      },
    };

    const jsonContent = JSON.stringify(backup, null, 0); // compact
    const sizeKB = Math.round(jsonContent.length / 1024);

    // ── Upload to Supabase Storage ─────────────────────────────────
    // Ensure bucket exists (idempotent)
    await supabase.storage.createBucket(BACKUP_BUCKET, {
      public: false,
      fileSizeLimit: 50 * 1024 * 1024, // 50MB max
    }).catch(() => { /* bucket already exists */ });

    const { error: uploadError } = await supabase.storage
      .from(BACKUP_BUCKET)
      .upload(filename, jsonContent, {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Upload failed", details: uploadError.message },
        { status: 500 }
      );
    }

    // ── Cleanup old backups (keep last MAX_BACKUP_FILES) ──────────
    const { data: fileList } = await supabase.storage
      .from(BACKUP_BUCKET)
      .list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } });

    if (fileList && fileList.length > MAX_BACKUP_FILES) {
      const toDelete = fileList
        .slice(MAX_BACKUP_FILES)
        .map((f) => f.name);

      if (toDelete.length > 0) {
        await supabase.storage.from(BACKUP_BUCKET).remove(toDelete);
      }
    }

    // ── Response ──────────────────────────────────────────────────
    const rowCounts = Object.fromEntries(
      Object.entries(backup.data).map(([k, v]) => [k, (v as unknown[]).length])
    );

    return NextResponse.json({
      ok: true,
      filename,
      sizeKB,
      rowCounts,
      timestamp: backup.meta.created_at,
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
