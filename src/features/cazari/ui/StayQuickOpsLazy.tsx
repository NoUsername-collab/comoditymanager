"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { StayQuickOps } from "@/features/cazari/ui/StayQuickOps";

const StayQuickOpsDynamic = dynamic(
  () =>
    import("@/features/cazari/ui/StayQuickOps").then((m) => ({
      default: m.StayQuickOps,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="stay-quick-ops stay-quick-ops--skeleton"
        aria-busy="true"
        aria-hidden
      />
    ),
  }
);

export function StayQuickOpsLazy(props: ComponentProps<typeof StayQuickOps>) {
  return <StayQuickOpsDynamic {...props} />;
}
