/**
 * GET /api/cron/fiscal-submissions
 *
 * Processes pending ANAF e-Factura submission jobs (async background queue).
 * Triggered by Vercel Cron every 10 minutes.
 *
 * Security: requires CRON_SECRET bearer (Vercel injects automatically).
 */

import { NextRequest, NextResponse } from "next/server";
import { processPendingFiscalJobs } from "@/services/fiscal-submission";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processPendingFiscalJobs(25);
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Fiscal submission cron failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
