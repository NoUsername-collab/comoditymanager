import { getTranslations } from "next-intl/server";
import { TenantEmailDeliveryForm } from "@/features/platform-admin/ui/TenantEmailDeliveryForm";
import { getTenantEmailOperatorSnapshot } from "@/services/tenant-email-delivery";

export async function TenantEmailDeliveryPanel({ tenantId }: { tenantId: string }) {
  const [snapshot, t] = await Promise.all([
    getTenantEmailOperatorSnapshot(tenantId),
    getTranslations("platformAdmin.tenantDetail.emailDelivery"),
  ]);

  if (!snapshot) return null;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3.5">
      <h2 className="mb-2 text-sm font-semibold uppercase text-neutral-500">
        {t("title")}
      </h2>
      <TenantEmailDeliveryForm tenantId={tenantId} snapshot={snapshot} />
    </div>
  );
}
