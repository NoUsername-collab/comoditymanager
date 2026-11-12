"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { AdminDashboardData } from "@/services/admin-dashboard";

const PublicStaffPreviewDynamic = dynamic(
  () =>
    import("@/features/public-site/ui/PublicStaffPreview").then((m) => ({
      default: m.PublicStaffPreview,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="public-staff-preview-skeleton min-h-[8rem] animate-pulse rounded-xl border border-[var(--site-border)] bg-[var(--site-card)]"
        aria-busy="true"
      />
    ),
  }
);

/**
 * Staff only: today's requests and arrivals in one closed line under the site,
 * so the page looks as guests see it; the operator panel opens on request.
 */
export function PublicStaffPreviewLazy({ data }: { data: AdminDashboardData }) {
  const t = useTranslations("public.staffPreview");
  const [open, setOpen] = useState(false);

  return (
    <details
      className="public-staff-peek public-section pt-0"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="public-staff-peek__summary">
        <span className="public-staff-peek__label">{t("peekLabel")}</span>
        <span className="public-staff-peek__counts">
          {t("peekCounts", {
            requests: data.requestCount,
            arrivals: data.todayBoard?.arrivals.length ?? 0,
          })}
        </span>
      </summary>
      {open ? <PublicStaffPreviewDynamic data={data} /> : null}
    </details>
  );
}
