"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { breakdownTenantModules } from "@/core/config/plan-catalog";
import { MODULE_CATALOG, type PlanId } from "@/core/config/plans";
import { useRouter } from "@/i18n/navigation";
import { changeTenantModulesAction } from "@/features/platform-admin/tenant-actions";

const ALL_MODULES = Object.values(MODULE_CATALOG);

export function TenantModulesForm({
  tenantId,
  currentModules,
  planId,
}: {
  tenantId: string;
  currentModules: string[];
  planId: PlanId;
}) {
  const t = useTranslations("platformAdmin.tenantDetail.modulesForm");
  const tModule = useTranslations("platformAdmin.logsPage.modules");
  const tIncludes = useTranslations("platformAdmin.tenantDetail.planIncludes");
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(currentModules);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const included = breakdownTenantModules(planId, currentModules).includedInPlan;

  const toggle = (moduleId: string) => {
    setSelected((prev) =>
      prev.includes(moduleId)
        ? prev.filter((m) => m !== moduleId)
        : [...prev, moduleId]
    );
  };

  const hasChanged =
    JSON.stringify([...selected].sort()) !==
    JSON.stringify([...currentModules].sort());

  const handleSave = () => {
    if (!hasChanged) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await changeTenantModulesAction(tenantId, selected);
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
        {ALL_MODULES.map((m) => (
          <label
            key={m.id}
            className={`nestio-tenant-option flex min-h-[var(--ml-touch-min,2.75rem)] cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
              selected.includes(m.id)
                ? "border-sky-600 bg-sky-950/50 text-white"
                : "border-neutral-700 text-neutral-400 hover:border-neutral-600"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(m.id)}
              onChange={() => toggle(m.id)}
              className="h-3.5 w-3.5 rounded border-neutral-600 bg-neutral-800 text-sky-500 focus:ring-sky-600"
            />
            <span className="flex-1">{tModule(m.id)}</span>
            {included.includes(m.id) && (
              <span className="text-[10px] uppercase text-emerald-500">
                {tIncludes("badgeIncluded")}
              </span>
            )}
          </label>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={isPending || !hasChanged}
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