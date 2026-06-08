"use client";

import type { CSSProperties } from "react";
import { useGanttContextMenu } from "@/components/admin/gantt/GanttContextMenuContext";
import { useGanttMenuTrigger } from "@/components/admin/gantt/useGanttMenuTrigger";
import type { GanttBarPosition } from "@/domain/gantt/bar-position";
import type { OccupancyKind, OccupancySegment } from "@/domain/occupancy/types";
import { GANTT_OCC_BAR_H, GANTT_OCC_BAR_TOP } from "@/domain/gantt/layout";

type Props = {
  label: string;
  title: string;
  pos: GanttBarPosition;
  kind: Extract<OccupancyKind, "hold" | "block">;
  segment: OccupancySegment;
  roomName: string;
  expiresAt?: string | null;
  onOpen?: () => void;
};

export function GanttOccupancyBar({
  label,
  title,
  pos,
  kind,
  segment,
  roomName,
  expiresAt,
  onOpen,
}: Props) {
  const { openMenu } = useGanttContextMenu();
  const { leftPct, widthPct, continuesBefore, continuesAfter } = pos;

  const className = [
    "gantt-booking-card gantt-occ-bar gantt-occ-bar--chip pointer-events-auto absolute z-[2] box-border flex min-w-0 max-w-full cursor-pointer items-stretch overflow-hidden text-[9px] font-bold leading-none",
    kind === "hold" && "gantt-booking-card--hold gantt-occ-bar--hold",
    kind === "block" && "gantt-booking-card--block gantt-occ-bar--block",
    continuesBefore && "gantt-occ-bar--from-prev",
    continuesAfter && "gantt-occ-bar--to-next",
  ]
    .filter(Boolean)
    .join(" ");

  const style = {
    left: `${leftPct}%`,
    width: `${widthPct}%`,
    maxWidth: `${100 - leftPct}%`,
    height: GANTT_OCC_BAR_H,
    top: GANTT_OCC_BAR_TOP,
  } as CSSProperties;

  const fullTitle = expiresAt
    ? `${title} · expiră ${new Date(expiresAt).toLocaleString("ro-RO")}`
    : title;

  function openContextMenu(clientX: number, clientY: number) {
    openMenu({
      kind,
      clientX,
      clientY,
      segment,
      roomName,
    });
  }

  const menuTrigger = useGanttMenuTrigger(openContextMenu);

  return (
    <div
      className={className}
      style={style}
      data-gantt-occ=""
      title={fullTitle}
      aria-label={fullTitle}
      data-gantt-block-interaction=""
      role="button"
      tabIndex={0}
      onPointerDown={(e) => {
        e.stopPropagation();
        menuTrigger.onPointerDown(e);
      }}
      onPointerMove={menuTrigger.onPointerMove}
      onPointerUp={menuTrigger.onPointerUp}
      onPointerCancel={menuTrigger.onPointerCancel}
      onClick={(e) => {
        e.stopPropagation();
        if (menuTrigger.consumeLongPress()) return;
        onOpen?.();
      }}
      onContextMenu={menuTrigger.onContextMenu}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.();
        }
      }}
    >
      <span className="gantt-occ-bar__spine" aria-hidden />
      <span className="gantt-occ-bar__label truncate">
        <span className="gantt-occ-bar__glyph" aria-hidden>
          {kind === "block" ? "⊘" : "⏳"}
        </span>
        <span className="gantt-occ-bar__label-text">{label}</span>
      </span>
    </div>
  );
}
