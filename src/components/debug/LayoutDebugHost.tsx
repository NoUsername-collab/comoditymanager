"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import "@/styles/features/layout/layout-debug.css";

const LayoutDebugOverlay = dynamic(
  () =>
    import("@/components/debug/LayoutDebugOverlay").then((m) => m.LayoutDebugOverlay),
  { ssr: false }
);

/** Renders layout diagnostics when ?layout_debug=1 or localStorage flag is set. */
export function LayoutDebugHost() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (process.env.NODE_ENV !== "development" || !mounted) return null;
  return <LayoutDebugOverlay />;
}
