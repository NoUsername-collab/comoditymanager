/**
 * GET /api/cron/backup
 *
 * Backs up the properties that are due (last backup over 20 hours ago),
 * oldest first, as many as fit in this call; the rest follow on the next
 * hourly run. Each backup is one JSON file per property in the private
 * "backups" bucket, every table read in full (see services/tenant-backup.ts).
 *
 * Security: requires CRON_SECRET header (Vercel injects this automatically).
 */

import { NextRequest, NextResponse } from "next/server";
import { runDueTenantBackups } from "@/services/tenant-backup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Stop starting new properties after this long, leaving time to finish the current one. */
const TIME_BUDGET_MS = 40_000;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { due, results } = await runDueTenantBackups(TIME_BUDGET_MS);
    const failed = results.filter((r) => !r.ok).length;
    return NextResponse.json({
      ok: failed === 0,
      timestamp: new Date().toISOString(),
      due,
      backedUp: results.length - failed,
      failed,
      waiting: Math.max(0, due - results.length),
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Backup failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
