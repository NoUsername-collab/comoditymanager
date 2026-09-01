import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { AdminActivityHistoryPanel } from "@/features/activity/ui/AdminActivityHistoryPanel";

export const dynamic = "force-dynamic";

export default async function AdminIstoricPage() {
  const [t] = await Promise.all([
    getTranslations("admin.pages.settings"),
    requireStaff(),
  ]);

  return (
    <AdminPageFrame
      title={t("navHistory")}
      description={t("historySubtitle")}
      className="admin-settings-page w-full max-w-none"
    >
      <AdminActivityHistoryPanel />
    </AdminPageFrame>
  );
}
