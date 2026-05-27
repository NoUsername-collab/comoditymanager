function starTone(value: number): string {
  if (value <= 1.5) return "#dc2626";
  if (value <= 2.5) return "#ea580c";
  if (value <= 3.5) return "#f59e0b";
  if (value <= 4.5) return "#facc15";
  return "#fde047";
}

export function GuestStarsCompact({
  value,
  count,
  size = "sm",
  showCount = true,
  showValue = true,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
  showCount?: boolean;
  showValue?: boolean;
}) {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;
  const rounded = Math.max(0, Math.min(5, Math.round(safeValue)));
  const iconSize = size === "md" ? 18 : 12;
  const reviewCount = count ?? 0;
  const hasReviews = reviewCount > 0;
  const tone = starTone(safeValue);
  const emptyStroke = "#94a3b8";
  const emptyFill = "#f8fafc";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 font-medium",
        size === "md" ? "text-sm" : "text-xs",
      ].join(" ")}
      style={{ color: tone }}
      title={
        hasReviews
          ? `${safeValue.toFixed(1)} din 5${reviewCount ? ` · ${reviewCount} review-uri` : ""}`
          : `${safeValue.toFixed(1)} standard initial · fara evaluari inca`
      }
    >
      <span className="inline-flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, index) => {
          const filled = index < rounded;
          return (
            <svg
              key={index}
              width={iconSize}
              height={iconSize}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <polygon
                points="12,2 15,9 22,9 16.5,13.5 18.5,21 12,16.8 5.5,21 7.5,13.5 2,9 9,9"
                fill={filled ? tone : emptyFill}
                stroke={filled ? tone : emptyStroke}
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          );
        })}
      </span>
      {showValue && (
        <span style={{ color: "var(--text-muted)" }}>
          {hasReviews ? safeValue.toFixed(1) : "standard"}
          {showCount && reviewCount ? ` (${reviewCount})` : ""}
        </span>
      )}
    </span>
  );
}
