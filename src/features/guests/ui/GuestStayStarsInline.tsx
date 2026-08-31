function starTone(value: number): string {
  if (value <= 1.5) return "var(--star-compact-1)";
  if (value <= 2.5) return "var(--star-compact-2)";
  if (value <= 3.5) return "var(--star-compact-3)";
  if (value <= 4.5) return "var(--star-compact-4)";
  return "var(--star-compact-5)";
}

/** Filled star row for a single stay rating (profile history, cards). */
export function GuestStayStarsInline({
  value,
  size = 12,
}: {
  value: number;
  size?: number;
}) {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;
  const rounded = Math.max(0, Math.min(5, Math.round(safeValue)));
  const tone = starTone(safeValue);
  const emptyStroke = "var(--star-empty-stroke)";
  const emptyFill = "var(--star-empty-fill)";

  if (rounded <= 0) return null;

  return (
    <span className="guest-stay-stars-inline" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => {
        const filled = index < rounded;
        return (
          <svg
            key={index}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className="guest-stay-stars-inline__star"
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
  );
}
