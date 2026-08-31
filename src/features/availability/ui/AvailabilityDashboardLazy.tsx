"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { AvailabilityDashboard } from "./AvailabilityDashboard";
import { AdminAvailabilitySkeleton } from "@/components/admin/loading/AdminAvailabilitySkeleton";

const AvailabilityDashboardDynamic = dynamic(
  () =>
    import("./AvailabilityDashboard").then((m) => ({
      default: m.AvailabilityDashboard,
    })),
  {
    ssr: false,
    loading: () => <AdminAvailabilitySkeleton />,
  }
);

export function AvailabilityDashboardLazy(
  props: ComponentProps<typeof AvailabilityDashboard>
) {
  return <AvailabilityDashboardDynamic {...props} />;
}
