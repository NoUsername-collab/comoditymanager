"use client";

import type { CSSProperties } from "react";
import type { GanttBarPosition } from "@/domain/gantt/bar-position";
import type { OccupancyKind } from "@/domain/occupancy/types";

type Props = {
  label: string;
  title: string;
  pos: GanttBarPosition;
  kind: Extract<OccupancyKind, "hold" | "block">;
  expiresAt?: string | null;
  onOpen?: () => void;
};

export function GanttOccupancyBar({
  label,
  title,
  pos,
  kind,
  expiresAt,
  onOpen,
}: Props) {
  const { leftPct, widthPct, continuesBefore, continuesAfter } = pos;

  const className = [
    "gantt-occ-bar absolute z-[2] box-border flex min-w-0 max-w-full cursor-pointer items-center overflow-hidden text-[9px] font-bold leading-none",
    kind === "hold" && "gantt-occ-bar--hold",
    kind === "block" && "gantt-occ-bar--block",
    continuesBefore && "gantt-occ-bar--from-prev",
    continuesAfter && "gantt-occ-bar--to-next",
  ]
    .filter(Boolean)
    .join(" ");

  const style = {
    left: `${leftPct}%`,
    width: `${widthPct}%`,
    maxWidth: `${100 - leftPct}%`,
    height: 24,
    top: 18,
  } as CSSProperties;

  const fullTitle = expiresAt
    ? `${title} · expiră ${new Date(expiresAt).toLocaleString("ro-RO")}`
    : title;

  return (
    <div
      className={className}
      style={style}
      title={fullTitle}
      aria-label={fullTitle}
      data-gantt-block-interaction=""
      role="button"
      tabIndex={0}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onOpen?.();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.();
        }
      }}
    >
      <span className="gantt-occ-bar__label truncate px-1.5 py-1">{label}</span>
    </div>
  );
}
