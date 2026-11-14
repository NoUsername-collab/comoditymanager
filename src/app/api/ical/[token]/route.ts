/**
 * GET /api/ical/<token>.ics
 *
 * A room's calendar for Booking.com, Airbnb and other sites to import: the
 * nights already taken in Zalmox, without guest names. The token is the
 * room's secret (rooms.ical_export_token); an unknown token, a property that
 * is not active or a plan without calendar sync answers 404.
 */

import { NextResponse, type NextRequest } from "next/server";
import { buildRoomIcalExport } from "@/services/ical-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token: raw } = await params;
  const token = raw.replace(/\.ics$/i, "").toLowerCase();
  try {
    const result = await buildRoomIcalExport(token);
    if (!result) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(result.ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="calendar.ics"',
        // Sites poll this; a few minutes of caching keeps them off the database.
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    console.error("[ical-export] failed", error);
    return new NextResponse("Calendar unavailable", { status: 503 });
  }
}
