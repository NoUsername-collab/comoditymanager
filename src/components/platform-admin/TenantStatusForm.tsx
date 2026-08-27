"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { changeTenantStatusAction } from "@/features/platform-admin/tenant-actions";

type TenantStatus = "active" | "trial" | "suspended" | "cancelled";

const STATUS_IDS: TenantStatus[] = [
  "active",
  "trial",
  "suspended",
  "cancelled",
];

const STATUS_COLOR: Record<TenantStatus, string> = {
  active: "text-emerald-400",
  trial: "text-amber-400",
  suspended: "text-red-400",
  cancelled: "text-neutral-500",
};

export function TenantStatusForm({
  tenantId,
  currentStatus,
}: {
  tenantId: string;
  currentStatus: string;
}) {
  const t = useTranslations("platformAdmin.tenantDetail.statusForm");
  const router = useRouter();
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
        {STATUS_IDS.map((id) => (
          <label
            key={id}
            className={`nestio-tenant-option flex min-h-[var(--ml-touch-min,2.75rem)] cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
              selected === id
                ? "border-sky-600 bg-sky-950/50 text-white"
                : "border-neutral-700 text-neutral-400 hover:border-neutral-600"
            }`}
          >
            <input
              type="radio"
              name="status"
              value={id}
              checked={selected === id}
              onChange={() => setSelected(id)}
              className="sr-only"
            />
            <span className={`flex-1 font-medium ${STATUS_COLOR[id]}`}>
              {t(id)}
            </span>
          </label>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={isPending || selected === currentStatus}
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
