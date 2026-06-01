"use client";

import dynamic from "next/dynamic";

const LayoutDebugOverlay = dynamic(
  () =>
    import("@/components/debug/LayoutDebugOverlay").then((m) => m.LayoutDebugOverlay),
  { ssr: false }
);

/** Renders layout diagnostics when ?layout_debug=1 or localStorage flag is set. */
export function LayoutDebugHost() {
  return <LayoutDebugOverlay />;
}
