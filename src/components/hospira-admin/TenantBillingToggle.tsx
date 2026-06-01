"use client";

import { useTransition } from "react";
import { changeTenantBillingAction } from "@/app/[locale]/hospira-admin/(panel)/actions/tenant-actions";

export function TenantBillingToggle({
  tenantId,
  isPaying,
}: {
  tenantId: string;
  isPaying: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      await changeTenantBillingAction(tenantId, !isPaying);
    });
  };

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        isPaying
          ? "bg-emerald-900 text-emerald-300 hover:bg-emerald-800"
          : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
      } disabled:opacity-50`}
    >
      {pending ? "..." : isPaying ? "Plătitor ✓" : "Gratuit"}
    </button>
  );
}
