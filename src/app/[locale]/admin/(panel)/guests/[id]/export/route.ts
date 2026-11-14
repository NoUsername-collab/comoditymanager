/**
 * GET /admin/guests/<id>/export
 *
 * Everything the property holds about one guest, as a JSON file to hand over
 * when the guest asks for their data (GDPR art. 15 and 20).
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireStaffPermission } from "@/lib/auth/require-staff";
import { exportGuestPersonalData } from "@/services/guest-privacy";
import { guestExportFileName } from "@/domain/guest/privacy";
import { todayIso } from "@/lib/stay-dates";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    await requireStaffPermission("booking_management");
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const data = await exportGuestPersonalData(id);
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${guestExportFileName(id, todayIso())}"`,
      "Cache-Control": "no-store",
    },
  });
}
