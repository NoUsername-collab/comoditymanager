"use client";

import dynamic from "next/dynamic";
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

export function PublicStaffPreviewLazy({ data }: { data: AdminDashboardData }) {
  return <PublicStaffPreviewDynamic data={data} />;
}
