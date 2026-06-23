"use client";

import { useState, useTransition } from "react";
import { changeTenantBillingAction } from "@/app/[locale]/hospira-admin/(panel)/actions/tenant-actions";

export function TenantBillingToggle({
  tenantId,
  isPaying,
}: {
  tenantId: string;
  isPaying: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = () => {
    setError(null);
    startTransition(async () => {
      const result = await changeTenantBillingAction(tenantId, !isPaying);
      if (!result.success) {
        setError(result.error ?? "Eroare");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`tenant-billing-toggle min-h-[var(--ml-touch-min,2.75rem)] rounded-full px-4 py-2 text-sm font-medium transition-colors ${
          isPaying
            ? "tenant-billing-toggle--paying"
            : "tenant-billing-toggle--free"
        } disabled:opacity-50`}
      >
        {pending ? "..." : isPaying ? "Plătitor ✓" : "Gratuit"}
      </button>
      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
