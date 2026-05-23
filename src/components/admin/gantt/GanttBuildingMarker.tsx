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
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 3.2 4 9.5v11.3h5.5v-6.8h4.9v6.8H20V9.5L12 3.2zm0 1.8 6.2 4.8V19h-2.7v-6.3H8.5V19H5.8v-9.2L12 5z" />
    </svg>
  );
}

function DoorIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path
        d="M6.75 4h10.5A1.75 1.75 0 0 1 19 5.75v12.5A1.75 1.75 0 0 1 17.25 20H6.75A1.75 1.75 0 0 1 5 18.25V5.75A1.75 1.75 0 0 1 6.75 4Z"
        opacity="0.32"
      />
      <path d="M8.25 5.75h7.5v12.5h-7.5V5.75Z" />
      <circle cx="14.35" cy="12" r="1.15" />
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
      <span className="gantt-ac-marker__halo" />
      <span className="gantt-ac-marker__ring" />
      {isHero && <span className="gantt-ac-marker__shine" />}
      <span className="gantt-ac-marker__glyph">
        {variant === "building" ? (
          <HouseIcon className="gantt-ac-marker__svg" />
        ) : (
          <DoorIcon className="gantt-ac-marker__svg" />
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
