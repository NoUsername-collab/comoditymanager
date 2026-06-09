export function StayMetricChip({
  label,
  value,
  tone = "zinc",
}: {
  label: string;
  value: number;
  tone?: "zinc" | "amber" | "emerald" | "sky" | "red";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : tone === "sky"
          ? "border-sky-200 bg-sky-50 text-sky-900"
          : tone === "red"
            ? "border-red-200 bg-red-50 text-red-900"
            : "border-zinc-200 bg-zinc-50 text-zinc-800";

  return (
    <div className={["rounded-md border px-3 py-2", toneClass].join(" ")}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
        {label}
      </p>
      <p className="mt-1 text-lg font-black leading-none">{value}</p>
    </div>
  );
}
