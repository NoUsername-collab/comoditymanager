"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { changeTenantBillingAction } from "@/features/platform-admin/tenant-actions";

export function TenantBillingToggle({
  tenantId,
  isPaying,
}: {
  tenantId: string;
  isPaying: boolean;
}) {
  const t = useTranslations("platformAdmin.tenantDetail.billingToggle");
  const router = useRouter();
  const [paying, setPaying] = useState(isPaying);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPaying(isPaying);
  }, [isPaying]);

  const toggle = () => {
    setError(null);
    const next = !paying;
    startTransition(async () => {
      const result = await changeTenantBillingAction(tenantId, next);
      if (!result.success) {
        setError(result.error ?? t("failed"));
        return;
      }
      setPaying(next);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`tenant-billing-toggle min-h-[var(--ml-touch-min,2.75rem)] rounded-full px-4 py-2 text-sm font-medium transition-colors ${
          paying
            ? "tenant-billing-toggle--paying"
            : "tenant-billing-toggle--free"
        } disabled:opacity-50`}
      >
        {pending ? t("pending") : paying ? t("paying") : t("free")}
      </button>
      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
