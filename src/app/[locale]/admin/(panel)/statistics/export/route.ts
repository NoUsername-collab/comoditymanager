import { NextRequest, NextResponse } from "next/server";
import { canAccessStatistics } from "@/domain/settings/statistics-visibility";
import { requireStaff } from "@/lib/auth/require-staff";
import {
  getPensionSettings,
  pensionStatisticsVisibility,
} from "@/services/pension-settings";
import { loadAccountingExportCsv } from "@/services/accounting-export";
import type { AccountingExportFormat } from "@/domain/accounting/saga-export";

function parseYear(value: string | null): number | null {
  const year = Number(value);
  if (!Number.isFinite(year) || year < 2000 || year > 2100) return null;
  return year;
}

function parseMonth(value: string | null): number | undefined | null {
  if (value == null || value === "" || value === "all") return undefined;
  const month = Number(value);
  if (!Number.isFinite(month) || month < 1 || month > 12) return null;
  return month;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const [{ memberRole }, pension] = await Promise.all([
    requireStaff(),
    getPensionSettings().catch(() => null),
  ]);
  const visibility = pensionStatisticsVisibility(pension);
  if (!canAccessStatistics(memberRole, visibility)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const year = parseYear(searchParams.get("year"));
  if (year == null) {
    return NextResponse.json({ error: "invalid_year" }, { status: 400 });
  }

  const parsedMonth = parseMonth(searchParams.get("month"));
  if (parsedMonth === null) {
    return NextResponse.json({ error: "invalid_month" }, { status: 400 });
  }
  const month = parsedMonth;

  const formatParam = searchParams.get("format");
  const format: AccountingExportFormat =
    formatParam === "contaplus" ? "contaplus" : "saga";
  const sliceParam = searchParams.get("slice");
  const slice =
    sliceParam === "proforma" ||
    sliceParam === "payments" ||
    sliceParam === "uninvoiced" ||
    sliceParam === "fiscal"
      ? sliceParam
      : undefined;
  const includeUninvoiced = searchParams.get("includeUninvoiced") === "1";

  try {
    const { csv, filename } = await loadAccountingExportCsv({
      year,
      month,
      format,
      slice,
      includeUninvoiced,
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "export_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
