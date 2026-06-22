/**
 * GET /api/cron/daily-summary
 *
 * Sends daily occupancy / check-in / check-out summary emails to tenant owners.
 * Triggered by Vercel Cron (vercel.json) every day at 05:00 UTC (~07:00 RO).
 *
 * Security: requires CRON_SECRET header (Vercel injects this automatically).
 *
 * Respects per-tenant email settings:
 *   email_enabled + email_notify_daily_summary
 */

import { NextRequest, NextResponse } from "next/server";
import { isEmailDeliveryConfigured } from "@/lib/email/provider";
import { notifyOwnerDailySummary } from "@/lib/email/notify";
import { buildDailySummaryForTenant } from "@/services/daily-summary-cron";
import { getEmailSettingsForTenant } from "@/services/email-settings";
import {
  getTenantNotificationEmails,
} from "@/services/tenants";

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

  if (!isEmailDeliveryConfigured()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "RESEND_API_KEY not configured",
    });
  }

  try {
    const { createPublicAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createPublicAdminClient();

    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, slug, timezone, status")
      .in("status", ["active", "trial"]);

    if (tenantsError) {
      return NextResponse.json(
        { error: "Failed to list tenants", details: tenantsError.message },
        { status: 500 },
      );
    }

    if (!tenants?.length) {
      return NextResponse.json({ ok: true, tenants: 0, sent: 0 });
    }

    const results: {
      slug: string;
      ok: boolean;
      sent?: number;
      skipped?: string;
      error?: string;
    }[] = [];

    for (const tenant of tenants) {
      try {
        const emailSettings = await getEmailSettingsForTenant(tenant.id);
        if (
          !emailSettings.email_enabled ||
          !emailSettings.email_notify_daily_summary
        ) {
          results.push({
            slug: tenant.slug,
            ok: true,
            skipped: "daily_summary_disabled",
          });
          continue;
        }

        const summary = await buildDailySummaryForTenant(tenant.id);
        if (!summary) {
          results.push({ slug: tenant.slug, ok: false, error: "summary_unavailable" });
          continue;
        }

        const recipients = await getTenantNotificationEmails(tenant.id);
        if (recipients.length === 0) {
          results.push({ slug: tenant.slug, ok: true, skipped: "no_recipients" });
          continue;
        }

        await Promise.all(
          recipients.map((ownerEmail) =>
            notifyOwnerDailySummary({
              tenantId: tenant.id,
              ownerEmail,
              summary,
              emailSettings,
            }),
          ),
        );

        results.push({ slug: tenant.slug, ok: true, sent: recipients.length });
      } catch (e) {
        results.push({
          slug: tenant.slug,
          ok: false,
          error: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }

    const sent = results.reduce((n, r) => n + (r.sent ?? 0), 0);
    const failed = results.filter((r) => !r.ok).length;

    return NextResponse.json({
      ok: failed === 0,
      timestamp: new Date().toISOString(),
      tenants: tenants.length,
      sent,
      failed,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Daily summary failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
