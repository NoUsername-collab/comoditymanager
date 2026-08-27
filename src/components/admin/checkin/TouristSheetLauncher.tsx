"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { loadTouristSheetAction } from "@/features/checkin/actions";
import { TouristSheetView } from "@/components/admin/checkin/TouristSheetView";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import type { TouristSheetData } from "@/domain/checkin/fisa-turist";

export function TouristSheetLauncher({
  bookingId,
  label,
  className = "",
}: {
  bookingId: string;
  label: string;
  className?: string;
}) {
  const tFisa = useTranslations("admin.checkIn.fisa");
  const tCommon = useTranslations("common");
  const { showToast } = useAdminFx();
  const [loading, setLoading] = useState(false);
  const [sheetData, setSheetData] = useState<TouristSheetData | null>(null);

  async function openSheet() {
    if (loading) return;
    setLoading(true);
    const res = await loadTouristSheetAction(bookingId);
    setLoading(false);
    if (!res.ok || !res.data) {
      showToast({
        kind: "error",
        title: tCommon("error"),
        message: res.error ?? "",
      });
      return;
    }
    setSheetData(res.data);
  }

  return (
    <>
      <button
        type="button"
        disabled={loading}
        onClick={() => void openSheet()}
        className={[
          "tourist-sheet-launcher",
          className ||
            "rounded border border-amber-400/80 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-950 hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {loading ? "..." : label}
      </button>

      {sheetData ? (
        <AdminFloatingPanel
          open
          onClose={() => setSheetData(null)}
          title={tFisa("title")}
          variant="modal"
          width={720}
          className="tourist-sheet-modal"
        >
          <TouristSheetView
            data={sheetData}
            onClose={() => setSheetData(null)}
          />
        </AdminFloatingPanel>
      ) : null}
    </>
  );
}
