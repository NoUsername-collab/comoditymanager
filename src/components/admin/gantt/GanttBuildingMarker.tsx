import type { CSSProperties } from "react";
import type { AcMode } from "@/types/database";
import {
  GANTT_AC_MARKER_BLUE,
  ganttMarkerAcPartial,
  resolveGanttAcMarkerColor,
} from "@/lib/gantt-ac-marker";

export { ganttMarkerShowsAc } from "@/lib/gantt-ac-marker";

function HouseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3.5 10.5 12 4l8.5 6.5" />
      <path d="M6.5 9.5V20h11V9.5" />
      <path d="M10 20v-5.5h4V20" />
    </svg>
  );
}

function BedIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3.5 12.5h17" />
      <path d="M5.5 12.5V8.5h5.5a2 2 0 0 1 2 2v2" />
      <path d="M13 12.5V10h3.5a2 2 0 0 1 2 2.5" />
      <path d="M5 12.5V20" />
      <path d="M19 12.5V20" />
    </svg>
  );
}

type MarkerBase = {
  acMode: AcMode;
  size?: "sm" | "md" | "lg";
  roomHasAc?: boolean;
  buildingHasAnyRoomAc?: boolean;
  title?: string;
};

function GanttAcMarker({
  variant,
  acMode,
  size = "md",
  roomHasAc,
  buildingHasAnyRoomAc,
  title,
}: MarkerBase & { variant: "building" | "room" }) {
  const color = resolveGanttAcMarkerColor(acMode, {
    roomHasAc,
    buildingHasAnyRoomAc,
  });
  const partial = ganttMarkerAcPartial(acMode, {
    roomHasAc,
    buildingHasAnyRoomAc,
  });
  const isHero = size === "lg" && variant === "building";
  const hasAc = color === GANTT_AC_MARKER_BLUE;

  const defaultTitle =
    variant === "building"
      ? hasAc
        ? partial
          ? "Clădire — AC pe unele camere"
          : "Clădire cu AC"
        : "Clădire fără AC"
      : hasAc
        ? "Cameră cu AC"
        : "Cameră fără AC";

  return (
    <span
      className={[
        "gantt-ac-marker",
        `gantt-ac-marker--${variant}`,
        `gantt-ac-marker--${size}`,
        isHero && "gantt-ac-marker--hero",
        partial && "gantt-ac-marker--partial",
        hasAc ? "gantt-ac-marker--cool" : "gantt-ac-marker--warm",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--marker-color": color } as CSSProperties}
      title={title ?? defaultTitle}
      aria-hidden={!title}
    >
      <span className="gantt-ac-marker__ring" />
      <span className="gantt-ac-marker__glyph">
        {variant === "building" ? (
          <HouseIcon className="gantt-ac-marker__svg" />
        ) : (
          <BedIcon className="gantt-ac-marker__svg" />
        )}
      </span>
    </span>
  );
}

/** Casă — albastru dacă are AC, portocaliu dacă nu. */
export function GanttBuildingMarker(props: MarkerBase) {
  return <GanttAcMarker variant="building" {...props} />;
}

/** Ușă cameră — aceeași logică AC pe cameră / clădire. */
export function GanttRoomMarker(props: MarkerBase) {
  return <GanttAcMarker variant="room" {...props} />;
}
