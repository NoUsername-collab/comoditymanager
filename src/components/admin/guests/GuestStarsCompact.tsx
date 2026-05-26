export function GuestStarsCompact({
  value,
  count,
  size = "sm",
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
}) {
  if (!Number.isFinite(value) || value <= 0) return null;

  const rounded = Math.max(0, Math.min(5, Math.round(value)));
  const filled = "★".repeat(rounded);
  const empty = "☆".repeat(Math.max(0, 5 - rounded));

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 font-medium text-amber-700",
        size === "md" ? "text-sm" : "text-xs",
      ].join(" ")}
      title={`${value.toFixed(1)} din 5${count ? ` · ${count} review-uri` : ""}`}
    >
      <span className="tracking-[0.08em]">
        {filled}
        <span className="text-amber-200">{empty}</span>
      </span>
      <span className="text-zinc-600">
        {value.toFixed(1)}
        {count ? ` (${count})` : ""}
      </span>
    </span>
  );
}
