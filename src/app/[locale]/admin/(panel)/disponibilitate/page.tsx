import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { AvailabilityDashboardShell } from "@/components/admin/availability/AvailabilityDashboardShell";
import { getTranslations } from "next-intl/server";

export default async function AdminDisponibilitatePage({
  searchParams,
}: {
  searchParams: Promise<{
    y?: string;
    m?: string;
    day?: string;
    building?: string;
    view?: string;
    ws?: string;
    feat?: string;
  }>;
}) {
  const t = await getTranslations("admin.pages.disponibilitate");
  const params = await searchParams;

  return (
    <AdminRetroPageFrame
      title={t("title")}
      description={t("description")}
      className="mx-auto max-w-[1600px]"
    >
      <AvailabilityDashboardShell
        searchParams={params}
        basePath="/admin/disponibilitate"
      />
    </AdminRetroPageFrame>
  );
}
