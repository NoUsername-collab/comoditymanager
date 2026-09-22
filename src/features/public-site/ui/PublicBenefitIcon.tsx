import {
  normalizeBenefitIcon,
  type PublicBenefitIconId,
} from "@/features/public-site/domain/benefit-icons";

function IconSvg({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="pub-benefit__svg"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

const PATH = {
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function BenefitGlyph({ id }: { id: PublicBenefitIconId }) {
  switch (id) {
    case "bed":
      return (
        <>
          <path d="M4 18V10.5A2.5 2.5 0 0 1 6.5 8H20v10" {...PATH} />
          <path d="M4 14h16M4 18h16" {...PATH} />
          <path d="M7 8V6.5A1.5 1.5 0 0 1 8.5 5h3A1.5 1.5 0 0 1 13 6.5V8" {...PATH} />
        </>
      );
    case "handshake":
      return (
        <>
          <path d="M8 13.5 11 16l5.5-5.5" {...PATH} />
          <path d="M4 14.5 8 13.5 10 11l2 1 3-2 5 4" {...PATH} />
          <path d="M7 9.5 4.5 8 3 10.5" {...PATH} />
          <path d="M17 9.5 19.5 8 21 10.5" {...PATH} />
        </>
      );
    case "leaf":
      return (
        <>
          <path d="M5 19c8-1 13-8 14-15-7 1-14 6-14 15Z" {...PATH} />
          <path d="M9 15c2-2 4.5-3.5 8-4" {...PATH} />
        </>
      );
    case "wifi":
      return (
        <>
          <path d="M5 10.5a9.5 9.5 0 0 1 14 0" {...PATH} />
          <path d="M8 13.5a5.5 5.5 0 0 1 8 0" {...PATH} />
          <path d="M12 17.5h.01" {...PATH} />
        </>
      );
    case "parking":
      return (
        <>
          <rect x="4.5" y="3.5" width="15" height="17" rx="2" {...PATH} />
          <path d="M9 16.5v-9h4.2a3 3 0 0 1 0 6H9" {...PATH} />
        </>
      );
    case "breakfast":
      return (
        <>
          <path d="M4 18h16" {...PATH} />
          <path d="M6 18V9a6 6 0 0 1 12 0v9" {...PATH} />
          <path d="M8 9h8" {...PATH} />
        </>
      );
    case "mountain":
      return (
        <>
          <path d="M3 18h18L14.5 6.5 11 12 8.5 9.5 3 18Z" {...PATH} />
          <path d="M14.5 6.5 16 4.5 21 12" {...PATH} />
        </>
      );
    case "spark":
    default:
      return (
        <>
          <path d="M12 3.5 13.4 9 19 10.5 13.4 12 12 17.5 10.6 12 5 10.5 10.6 9 12 3.5Z" {...PATH} />
        </>
      );
  }
}

export function PublicBenefitIcon({
  icon,
  title,
}: {
  icon?: string;
  title?: string;
}) {
  const id = normalizeBenefitIcon(icon);
  return (
    <span className="pub-benefit__icon" aria-hidden={title ? undefined : true}>
      <IconSvg title={title}>
        <BenefitGlyph id={id} />
      </IconSvg>
    </span>
  );
}
