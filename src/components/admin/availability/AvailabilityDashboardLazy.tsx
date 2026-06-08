"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { AvailabilityDashboard } from "@/components/admin/availability/AvailabilityDashboard";

const AvailabilityDashboardDynamic = dynamic(
  () =>
    import("@/components/admin/availability/AvailabilityDashboard").then((m) => ({
      default: m.AvailabilityDashboard,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-[12rem] items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500"
        aria-busy="true"
      >
        …
      </div>
    ),
  }
);

export function AvailabilityDashboardLazy(
  props: ComponentProps<typeof AvailabilityDashboard>
) {
  return <AvailabilityDashboardDynamic {...props} />;
}
