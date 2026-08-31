import { Link } from "@/i18n/navigation";

export function StatisticsYearNav({
  years,
  focusYear,
}: {
  years: number[];
  focusYear: number;
}) {
  return (
    <div className="statistics-year-nav flex flex-wrap gap-2">
      {years.map((y) => (
        <Link
          key={y}
          href={`/admin/statistics?year=${y}`}
          className={[
            "rounded-full px-3 py-1.5 text-sm font-semibold transition",
            y === focusYear
              ? "bg-zinc-900 text-white shadow-sm"
              : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
          ].join(" ")}
        >
          {y}
        </Link>
      ))}
    </div>
  );
}
