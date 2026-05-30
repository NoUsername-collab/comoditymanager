/**
 * GET /api/health
 *
 * Production health check endpoint.
 * Use with: UptimeRobot, BetterUptime, Vercel Cron, or any monitoring tool.
 *
 * Returns:
 *   200 — everything OK
 *   503 — database unreachable or critical failure
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HealthStatus = "ok" | "degraded" | "down";

interface HealthCheck {
  status: HealthStatus;
  timestamp: string;
  version: string;
  checks: {
    database: { status: HealthStatus; latencyMs: number };
    environment: { status: HealthStatus };
  };
}

export async function GET(): Promise<NextResponse<HealthCheck>> {
  const start = Date.now();
  const version = process.env.NEXT_PUBLIC_BUILD_SHA ?? "dev";

  // ── Database check ──────────────────────────────────────────────
  let dbStatus: HealthStatus = "down";
  let dbLatency = 0;

  try {
    const { createPublicAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createPublicAdminClient();

    const dbStart = Date.now();
    const { error } = await supabase
      .from("pension_settings")
      .select("id")
      .limit(1)
      .maybeSingle();
    dbLatency = Date.now() - dbStart;

    if (error) {
      dbStatus = "degraded";
    } else {
      dbStatus = dbLatency > 3000 ? "degraded" : "ok";
    }
  } catch {
    dbStatus = "down";
    dbLatency = Date.now() - start;
  }

  // ── Environment check ───────────────────────────────────────────
  let envStatus: HealthStatus = "ok";
  try {
    const { getServerEnv } = await import("@/lib/env/server");
    getServerEnv();
  } catch {
    envStatus = "down";
  }

  // ── Overall status ──────────────────────────────────────────────
  const overall: HealthStatus =
    dbStatus === "down" || envStatus === "down"
      ? "down"
      : dbStatus === "degraded"
        ? "degraded"
        : "ok";

  const body: HealthCheck = {
    status: overall,
    timestamp: new Date().toISOString(),
    version,
    checks: {
      database: { status: dbStatus, latencyMs: dbLatency },
      environment: { status: envStatus },
    },
  };

  return NextResponse.json(body, {
    status: overall === "down" ? 503 : 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
