"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { changeTenantPlanAction } from "@/app/[locale]/platform-admin/(panel)/actions/tenant-actions";
import { PLAN_CONFIGS, type CloudPlan, type PlanId } from "@/core/config/plans";

const CLOUD_PLAN_IDS: CloudPlan[] = [
  "free",
  "essential",
  "professional",
  "business",
];

export function TenantPlanForm({
  tenantId,
  currentPlan,
}: {
  tenantId: string;
  currentPlan: PlanId;
}) {
  const t = useTranslations("platformAdmin.tenantDetail.planForm");
  const router = useRouter();
  const [selected, setSelected] = useState<PlanId>(currentPlan);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSave = () => {
    if (selected === currentPlan) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await changeTenantPlanAction(tenantId, selected);
      if (result.success) {
        setFeedback(t("success"));
        router.refresh();
      } else {
        setFeedback(t("error", { message: result.error ?? t("failed") }));
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {CLOUD_PLAN_IDS.map((planId) => {
          const plan = PLAN_CONFIGS[planId];
          return (
            <label
              key={planId}
              className={`nestio-tenant-option flex min-h-[var(--ml-touch-min,2.75rem)] cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
                selected === planId
                  ? "border-sky-600 bg-sky-950/50 text-white"
                  : "border-neutral-700 text-neutral-400 hover:border-neutral-600"
              }`}
            >
              <input
                type="radio"
                name="plan"
                value={planId}
                checked={selected === planId}
                onChange={() => setSelected(planId)}
                className="sr-only"
              />
              <span className="flex-1 font-medium">{plan.label}</span>
              <span className="text-xs text-neutral-500">
                {plan.priceEur}€{t("perMonth")}
              </span>
            </label>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={isPending || selected === currentPlan}
        className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? t("saving") : t("save")}
      </button>

      {feedback && (
        <p
          className={`text-xs ${feedback === t("success") ? "text-emerald-400" : "text-red-400"}`}
        >
          {feedback}
        </p>
      )}
    </div>
  );
}
