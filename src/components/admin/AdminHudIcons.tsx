import type { ReactNode } from "react";

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function HudIconHome({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 8.5 10 3l7 5.5V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5z" />
      <path d="M8 18v-6h4v6" />
    </Svg>
  );
}

export function HudIconBuilding({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 17V6l6-3 6 3v11" />
      <path d="M8 17v-4h4v4M7 9h1M12 9h1M7 12h1M12 12h1" />
    </Svg>
  );
}

export function HudIconBed({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 14v-3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
      <path d="M3 14h14M5 9V7M15 9V7" />
    </Svg>
  );
}

export function HudIconInbox({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 5h14l-2 10H5L3 5z" />
      <path d="M3 5l2 4h10l2-4" />
    </Svg>
  );
}

export function HudIconCalendar({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="4" width="14" height="13" rx="1.5" />
      <path d="M3 8h14M7 2v3M13 2v3" />
    </Svg>
  );
}

export function HudIconGrid({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 3h5v5H3zM12 3h5v5h-5zM3 12h5v5H3zM12 12h5v5h-5z" />
    </Svg>
  );
}

export function HudIconChart({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 16V9M10 16V4M16 16v-6" />
    </Svg>
  );
}

export function HudIconHistory({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l2.5 2.5" />
    </Svg>
  );
}

export function HudIconPerson({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="10" cy="7" r="3" />
      <path d="M4 17c0-3 2.5-5 6-5s6 2 6 5" />
    </Svg>
  );
}

export function HudIconGear({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.9 4.9l1.4 1.4M13.7 13.7l1.4 1.4M4.9 15.1l1.4-1.4M13.7 6.3l1.4-1.4" />
    </Svg>
  );
}

export function HudIconPhone({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6.5 3.5h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z" />
      <path d="M9.5 14.5h1" />
    </Svg>
  );
}

export function HudIconGlobe({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="10" cy="10" r="7" />
      <path d="M3 10h14M10 3a11 11 0 0 1 0 14M10 3a11 11 0 0 0 0 14" />
    </Svg>
  );
}

export function HudIconLogout({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M8 17H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h3M13 14l4-4-4-4M9 10h8" />
    </Svg>
  );
}

export type HudIconName =
  | "home"
  | "building"
  | "bed"
  | "inbox"
  | "calendar"
  | "grid"
  | "chart"
  | "history"
  | "person"
  | "gear"
  | "phone";

const MAP = {
  home: HudIconHome,
  building: HudIconBuilding,
  bed: HudIconBed,
  inbox: HudIconInbox,
  calendar: HudIconCalendar,
  grid: HudIconGrid,
  chart: HudIconChart,
  history: HudIconHistory,
  person: HudIconPerson,
  gear: HudIconGear,
  phone: HudIconPhone,
} as const;

export function AdminHudIcon({
  name,
  className,
}: {
  name: HudIconName;
  className?: string;
}) {
  const Icon = MAP[name];
  return <Icon className={className} />;
}
