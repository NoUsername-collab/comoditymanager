"use client";

import dynamic from "next/dynamic";

const LayoutDebugHost = dynamic(
  () =>
    import("@/components/debug/LayoutDebugHost").then((m) => m.LayoutDebugHost),
  { ssr: false }
);

/** Keeps layout debug tooling out of production bundles. */
export function LayoutDebugHostGate() {
  if (process.env.NODE_ENV !== "development") return null;
  return <LayoutDebugHost />;
}
