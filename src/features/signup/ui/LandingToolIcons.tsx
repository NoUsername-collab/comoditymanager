import type { ReactNode } from "react";

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export type LandingToolIconName =
  | "gantt"
  | "cazari"
  | "checkin"
  | "guestApp"
  | "disponibilitate"
  | "fiscal"
  | "buildings"
  | "publicSite";

function IconGantt({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 4V2M16 4V2" />
      <path d="M7 13h5M7 16h8" fill="currentColor" stroke="none" opacity="0.35" />
      <rect x="13" y="12" width="6" height="2.5" rx="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

function IconCazari({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 16V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7" />
      <path d="M4 16h16M7 7V5M17 7V5" />
      <path d="M9 13h6" />
    </Svg>
  );
}

function IconCheckin({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M8.5 16.5c.8-1.8 2.2-2.5 3.5-2.5s2.7.7 3.5 2.5" />
      <path d="M16 6l1.5 1.5L20 5" />
    </Svg>
  );
}

function IconGuestApp({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M11 18h2" />
      <path d="M9 7h6M9 10h4" />
    </Svg>
  );
}

function IconDisponibilitate({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 19V5M4 19h16M8 15l3-4 3 2 4-6" />
      <circle cx="8" cy="15" r="1" fill="currentColor" stroke="none" />
      <circle cx="11" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="7" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

function IconFiscal({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6 3h12v18H6z" />
      <path d="M9 7h6M9 11h6M9 15h4" />
      <path d="M14 3v4h4" />
    </Svg>
  );
}

function IconBuildings({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 20V8l5-2.5L13 8v12" />
      <path d="M13 20V6l5-2 5 2v14" />
      <path d="M6 12h1M6 15h1M16 10h1M16 13h1M16 16h1" />
    </Svg>
  );
}

function IconPublicSite({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </Svg>
  );
}

const MAP = {
  gantt: IconGantt,
  cazari: IconCazari,
  checkin: IconCheckin,
  guestApp: IconGuestApp,
  disponibilitate: IconDisponibilitate,
  fiscal: IconFiscal,
  buildings: IconBuildings,
  publicSite: IconPublicSite,
} as const;

export function LandingToolIcon({
  name,
  className,
}: {
  name: LandingToolIconName;
  className?: string;
}) {
  const Icon = MAP[name];
  return <Icon className={className} />;
}
