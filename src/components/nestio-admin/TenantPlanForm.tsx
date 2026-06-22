"use client";

import { useState, useTransition } from "react";
import { changeTenantPlanAction } from "@/app/[locale]/nestio-admin/(panel)/actions/tenant-actions";
import type { PlanId, CloudPlan } from "@/core/config/plans";

const CLOUD_PLANS: { id: CloudPlan; label: string; price: string }[] = [
  { id: "free", label: "Free", price: "0€" },
  { id: "essential", label: "Essential", price: "19€" },
  { id: "professional", label: "Professional", price: "49€" },
  { id: "business", label: "Business", price: "99€" },
];

export function TenantPlanForm({
  tenantId,
  currentPlan,
}: {
  tenantId: string;
  currentPlan: PlanId;
}) {
  const [selected, setSelected] = useState<PlanId>(currentPlan);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSave = () => {
    if (selected === currentPlan) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await changeTenantPlanAction(tenantId, selected);
      if (result.success) {
        setFeedback("Plan actualizat.");
      } else {
        setFeedback(`Eroare: ${result.error}`);
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {CLOUD_PLANS.map((plan) => (
          <label
            key={plan.id}
            className={`nestio-tenant-option flex min-h-[var(--ml-touch-min,2.75rem)] cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
              selected === plan.id
                ? "border-sky-600 bg-sky-950/50 text-white"
                : "border-neutral-700 text-neutral-400 hover:border-neutral-600"
            }`}
          >
            <input
              type="radio"
              name="plan"
              value={plan.id}
              checked={selected === plan.id}
              onChange={() => setSelected(plan.id)}
              className="sr-only"
            />
            <span className="flex-1 font-medium">{plan.label}</span>
            <span className="text-xs text-neutral-500">{plan.price}/lună</span>
          </label>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={isPending || selected === currentPlan}
        className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Se salvează..." : "Salvează plan"}
      </button>

      {feedback && (
        <p
          className={`text-xs ${feedback.startsWith("Eroare") ? "text-red-400" : "text-emerald-400"}`}
        >
          {feedback}
        </p>
      )}
    </div>
  );
}
