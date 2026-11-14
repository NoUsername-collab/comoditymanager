/**
 * GET /api/cron/ical-sync
 *
 * Imports the calendars of Booking.com, Airbnb and other sites into their
 * rooms as blocks, the feeds waiting longest first. Triggered by Vercel Cron
 * every 15 minutes.
 *
 * Security: requires CRON_SECRET bearer (Vercel injects automatically).
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { syncDueIcalFeeds } from "@/services/ical-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await syncDueIcalFeeds(40);
    // Properties whose rooms changed see it on the calendar and the site at once.
    for (const tenantId of new Set(results.filter((r) => r.changed).map((r) => r.tenantId))) {
      revalidateTag(tenantTag(tenantId, CACHE_TAGS.bookingCounts), "max");
    }
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      feeds: results.length,
      failed: results.filter((r) => !r.ok).length,
      changed: results.filter((r) => r.changed).length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "iCal sync failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
