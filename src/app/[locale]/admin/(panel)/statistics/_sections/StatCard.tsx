export function StatCard({
  label,
  value,
  hint,
  small,
}: {
  label: string;
  value: string;
  hint?: string;
  small?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-900/5",
        small ? "px-3 py-2" : "px-4 py-3",
      ].join(" ")}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p
        className={[
          "mt-1 font-bold tabular-nums text-zinc-900",
          small ? "text-base" : "text-xl",
        ].join(" ")}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-amber-700">{hint}</p>}
    </div>
  );
}
