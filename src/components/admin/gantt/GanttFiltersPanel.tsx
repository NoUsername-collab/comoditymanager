"use client";

import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import { SegmentGroup } from "@/components/admin/gantt/GanttToolbar";
import type { GanttFeatureFilter, GanttFilter } from "@/domain/gantt/filters";
import type { GanttCalendarPatch } from "@/hooks/useGanttCalendarNavigation";
import { useTranslations } from "next-intl";

export function GanttFiltersPanel({
  open,
  onClose,
  anchorRect,
  filter,
  selectedFeature,
  focusDay,
  onCalendarPatch,
}: {
  open: boolean;
  onClose: () => void;
  anchorRect: DOMRect | null;
  filter: GanttFilter;
  selectedFeature: GanttFeatureFilter;
  focusDay: string | null;
  onCalendarPatch: (patch: GanttCalendarPatch) => void;
}) {
  const tCommon = useTranslations("admin.common");

  return (
    <AdminFloatingPanel
      open={open}
      onClose={onClose}
      title={tCommon("filters")}
      anchorRect={anchorRect}
      width={360}
      className="gantt-filters-panel"
    >
      <div className="space-y-4 p-1">
        <SegmentGroup
          label={tCommon("roomsLabel")}
          compact
          value={filter}
          onChange={(next) => {
            onClose();
            onCalendarPatch({
              filter: next as GanttFilter,
              fd: next === "free" ? focusDay || null : null,
            });
          }}
          options={[
            { value: "all", label: tCommon("all") },
            { value: "occupied", label: tCommon("occupied") },
            { value: "free", label: tCommon("free") },
          ]}
        />

        <SegmentGroup
          label={tCommon("filters")}
          compact
          value={selectedFeature}
          onChange={(next) => {
            onClose();
            onCalendarPatch({ feat: next as GanttFeatureFilter });
          }}
          options={[
            { value: "all", label: tCommon("all") },
            { value: "ac", label: tCommon("withAc") },
            { value: "fridge", label: tCommon("fridge") },
          ]}
        />
      </div>
    </AdminFloatingPanel>
  );
}
