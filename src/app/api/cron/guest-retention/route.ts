/**
 * GET /api/cron/guest-retention
 *
 * Clears guests' identity documents once their last stay is older than each
 * property's retention period (migration 122). Triggered by Vercel Cron daily.
 *
 * Security: requires CRON_SECRET bearer (Vercel injects automatically).
 */

import { NextRequest, NextResponse } from "next/server";
import { purgeExpiredGuestIdentity } from "@/services/guest-privacy";

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
    const guests = await purgeExpiredGuestIdentity();
    return NextResponse.json({ ok: true, timestamp: new Date().toISOString(), guests });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Guest retention failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
