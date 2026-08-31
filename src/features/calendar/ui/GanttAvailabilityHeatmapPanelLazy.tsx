"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const GanttAvailabilityHeatmapPanel = dynamic(
  () =>
    import("./GanttAvailabilityHeatmapPanel").then((m) => ({
      default: m.GanttAvailabilityHeatmapPanel,
    })),
  { ssr: false }
);

export function GanttAvailabilityHeatmapPanelLazy(
  props: ComponentProps<typeof GanttAvailabilityHeatmapPanel>
) {
  if (!props.open) return null;
  return <GanttAvailabilityHeatmapPanel {...props} />;
}
