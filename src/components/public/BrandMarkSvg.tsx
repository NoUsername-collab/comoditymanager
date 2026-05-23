type Props = {
  size?: number;
  animated?: boolean;
  className?: string;
};

export function BrandMarkSvg({
  size,
  animated = true,
  className = "",
}: Props) {
  const draw = animated ? "brand-draw" : "";
  const d1 = animated ? "brand-draw brand-draw-delay" : "";
  const d2 = animated ? "brand-draw brand-draw-delay-2" : "";
  const boxClass = [
    "relative shrink-0 overflow-hidden",
    className || (size == null ? "h-16 w-16" : ""),
  ].join(" ");
  const boxStyle =
    size != null && !className
      ? { width: size, height: size, maxWidth: size, maxHeight: size }
      : undefined;

  const svg = (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className="brand-logo-img h-full w-full"
      aria-hidden
    >
      <path
        className={draw}
        d="M8 22 L24 8 L40 22"
        stroke="#b45309"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className={d1}
        d="M12 22 V38 H36 V22"
        stroke="#1e3a5f"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className={d2}
        d="M20 38 V28 H28 V38"
        stroke="#1e3a5f"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  if (!animated) {
    return (
      <div className={boxClass} style={boxStyle}>
        {svg}
      </div>
    );
  }

  return (
    <div className={`brand-logo-shell ${boxClass}`} style={boxStyle}>
      {svg}
    </div>
  );
}
