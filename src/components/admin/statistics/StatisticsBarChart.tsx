export function StatisticsBarChart({
  title,
  caption,
  items,
  valueSuffix = "",
  maxValue,
}: {
  title: string;
  caption?: string;
  items: { label: string; value: number; tone?: "emerald" | "blue" | "amber" | "zinc" }[];
  valueSuffix?: string;
  maxValue?: number;
}) {
  const max = maxValue ?? Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm ring-1 ring-zinc-900/5">
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      {caption && (
        <p className="mt-0.5 text-xs text-zinc-500">{caption}</p>
      )}
      <div className="mt-4 flex items-end justify-between gap-2 sm:gap-3">
        {items.map((item) => {
          const h = max > 0 ? Math.max(8, Math.round((item.value / max) * 100)) : 8;
          const bar =
            item.tone === "emerald"
              ? "bg-emerald-500"
              : item.tone === "amber"
                ? "bg-amber-400"
                : item.tone === "blue"
                  ? "bg-blue-500"
                  : "bg-zinc-400";
          return (
            <div
              key={item.label}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <span className="text-[10px] font-bold tabular-nums text-zinc-700">
                {item.value}
                {valueSuffix}
              </span>
              <div
                className={`w-full max-w-[2.5rem] rounded-t-md ${bar} transition-all`}
                style={{ height: `${h}px` }}
                title={`${item.label}: ${item.value}${valueSuffix}`}
              />
              <span className="text-[10px] font-medium text-zinc-500">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
