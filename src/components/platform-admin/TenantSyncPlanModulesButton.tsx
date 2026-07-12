"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { syncTenantPlanModulesAction } from "@/app/[locale]/platform-admin/(panel)/actions/tenant-actions";
import type { PlanId } from "@/core/config/plans";

export function TenantSyncPlanModulesButton({
  tenantId,
  planId,
}: {
  tenantId: string;
  planId: PlanId;
}) {
  const t = useTranslations("platformAdmin.tenantDetail.planIncludes");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSync = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await syncTenantPlanModulesAction(tenantId, planId);
      if (result.success) {
        setFeedback(t("syncSuccess"));
        router.refresh();
      } else {
        setFeedback(t("syncError", { message: result.error ?? t("syncFailed") }));
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleSync}
        disabled={isPending}
        className="rounded-md border border-neutral-700 px-2 py-1 text-[11px] text-neutral-300 hover:border-neutral-500 disabled:opacity-50"
      >
        {isPending ? t("syncing") : t("syncModules")}
      </button>
      {feedback && (
        <span className="text-[10px] text-neutral-400">{feedback}</span>
      )}
    </div>
  );
}
