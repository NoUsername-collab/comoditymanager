"use client";

import { useState, useTransition } from "react";
import { changeTenantStatusAction } from "@/app/[locale]/nestio-admin/(panel)/actions/tenant-actions";

type TenantStatus = "active" | "trial" | "suspended" | "cancelled";

const STATUSES: { id: TenantStatus; label: string; color: string }[] = [
  { id: "active", label: "Activ", color: "text-emerald-400" },
  { id: "trial", label: "Trial", color: "text-amber-400" },
  { id: "suspended", label: "Suspendat", color: "text-red-400" },
  { id: "cancelled", label: "Anulat", color: "text-neutral-500" },
];

export function TenantStatusForm({
  tenantId,
  currentStatus,
}: {
  tenantId: string;
  currentStatus: string;
}) {
  const [selected, setSelected] = useState<TenantStatus>(
    currentStatus as TenantStatus
  );
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSave = () => {
    if (selected === currentStatus) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await changeTenantStatusAction(tenantId, selected);
      if (result.success) {
        setFeedback("Status actualizat.");
      } else {
        setFeedback(`Eroare: ${result.error}`);
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {STATUSES.map((s) => (
          <label
            key={s.id}
            className={`nestio-tenant-option flex min-h-[var(--ml-touch-min,2.75rem)] cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
              selected === s.id
                ? "border-sky-600 bg-sky-950/50 text-white"
                : "border-neutral-700 text-neutral-400 hover:border-neutral-600"
            }`}
          >
            <input
              type="radio"
              name="status"
              value={s.id}
              checked={selected === s.id}
              onChange={() => setSelected(s.id)}
              className="sr-only"
            />
            <span className={`flex-1 font-medium ${s.color}`}>{s.label}</span>
          </label>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={isPending || selected === currentStatus}
        className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Se salvează..." : "Salvează status"}
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
