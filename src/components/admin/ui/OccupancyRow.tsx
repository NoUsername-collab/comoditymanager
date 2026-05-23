import { occupancyCaption } from "@/lib/admin-ui";

export function OccupancyRow({
  label,
  pct,
  accent,
  barTrack,
  caption,
}: {
  label: string;
  pct: number;
  accent: string;
  barTrack: string;
  caption?: string;
}) {
  const text = caption ?? occupancyCaption(pct);

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-[4.5rem] shrink-0 font-medium text-zinc-600">
        {label}
      </span>
      <div
        className={["h-1.5 w-24 shrink-0 overflow-hidden rounded-full", barTrack].join(
          " "
        )}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.max(pct, pct > 0 ? 8 : 0)}%`,
            backgroundColor: accent,
          }}
        />
      </div>
      <span className="min-w-0 flex-1 text-zinc-600">{text}</span>
    </div>
  );
}
