"use client";

import { useEffect, type RefObject } from "react";
import { useGanttContextMenu } from "@/components/admin/gantt/GanttContextMenuContext";
import type { GanttViewRange } from "@/domain/gantt/view-range";
import {
  isGanttSpecialContextTarget,
  resolveGanttCreateContext,
} from "@/domain/gantt/resolve-context-menu";
import type { OccupancySegment } from "@/domain/occupancy/types";

type Props = {
  shellRef: RefObject<HTMLElement | null>;
  viewRange: GanttViewRange;
  occupancy: OccupancySegment[];
};

/** Blochează meniul browser și deschide meniul general Casa Emil pe timeline. */
export function GanttContextMenuBridge({ shellRef, viewRange, occupancy }: Props) {
  const { openMenu } = useGanttContextMenu();
  const dayIsos = viewRange.days.map((d) => d.iso);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const blockBrowserMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const openGeneralMenu = (e: MouseEvent) => {
      if (isGanttSpecialContextTarget(e.target)) return;

      e.preventDefault();
      e.stopPropagation();

      const ctx = resolveGanttCreateContext(
        e.clientX,
        e.clientY,
        dayIsos,
        occupancy
      );

      openMenu({
        kind: "create",
        clientX: e.clientX,
        clientY: e.clientY,
        ...ctx,
      });
    };

    shell.addEventListener("contextmenu", blockBrowserMenu, { capture: true });
    shell.addEventListener("contextmenu", openGeneralMenu);

    return () => {
      shell.removeEventListener("contextmenu", blockBrowserMenu, { capture: true });
      shell.removeEventListener("contextmenu", openGeneralMenu);
    };
  }, [shellRef, dayIsos, occupancy, openMenu]);

  return null;
}
