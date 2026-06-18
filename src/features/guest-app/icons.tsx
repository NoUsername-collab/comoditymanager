import type { ReactNode } from "react";
import type { GuestAppFeatureId } from "@/domain/guest-app/types";
import type { GuestNavTabId } from "./nav";

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
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

export function GuestNavIcon({ id, className }: { id: GuestNavTabId; className?: string }) {
  switch (id) {
    case "home":
      return (
        <Svg className={className}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </Svg>
      );
    case "wifi":
      return (
        <Svg className={className}>
          <path d="M8.5 14.5a3.5 3.5 0 0 1 7 0" />
          <path d="M5 11a9 9 0 0 1 14 0" />
          <path d="M2 7.5a14 14 0 0 1 20 0" />
          <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
        </Svg>
      );
    case "hotel_info":
      return (
        <Svg className={className}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10v6" />
          <circle cx="12" cy="7.5" r=".75" fill="currentColor" stroke="none" />
        </Svg>
      );
    case "online_checkin":
      return (
        <Svg className={className}>
          <path d="M9 11 11 13 15 9" />
          <rect x="4" y="4" width="16" height="16" rx="3" />
        </Svg>
      );
    case "travel_tips":
      return (
        <Svg className={className}>
          <path d="M12 3 14.5 8.5 20.5 9.3 16 13.2 17.2 19 12 16.2 6.8 19 8 13.2 3.5 9.3 9.5 8.5Z" />
        </Svg>
      );
    case "menu":
      return (
        <Svg className={className}>
          <path d="M5 7h14M5 12h14M5 17h14" />
        </Svg>
      );
    default:
      return (
        <Svg className={className}>
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
        </Svg>
      );
  }
}

export function GuestFeatureIcon({
  id,
  className,
}: {
  id: GuestAppFeatureId | "feedback";
  className?: string;
}) {
  switch (id) {
    case "feedback":
      return (
        <Svg className={className}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </Svg>
      );
    case "hotel_info":
      return (
        <Svg className={className}>
          <path d="M4 20V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14" />
          <path d="M4 20h16M9 8h.01M9 12h.01M9 16h.01M15 8h.01M15 12h.01M15 16h.01" />
        </Svg>
      );
    case "gallery":
      return (
        <Svg className={className}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="m4 16 4.5-4.5 3 3L16 10l4 4" />
        </Svg>
      );
    case "online_checkin":
      return (
        <Svg className={className}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </Svg>
      );
    case "wifi":
      return <GuestNavIcon id="wifi" className={className} />;
    case "facilities":
      return (
        <Svg className={className}>
          <path d="M12 3v18M8 7h8M7 21h10" />
        </Svg>
      );
    case "services":
      return (
        <Svg className={className}>
          <path d="M8 12h8M12 8v8" />
          <circle cx="12" cy="12" r="9" />
        </Svg>
      );
    case "travel_tips":
      return <GuestNavIcon id="travel_tips" className={className} />;
    case "green_stay":
      return (
        <Svg className={className}>
          <path d="M12 21c-4-3.5-7-7.5-7-11a7 7 0 0 1 14 0c0 3.5-3 7.5-7 11Z" />
          <path d="M12 11v6" />
        </Svg>
      );
    case "online_payment":
      return (
        <Svg className={className}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18" />
        </Svg>
      );
  }
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m10 8 4 4-4 4" />
    </Svg>
  );
}
