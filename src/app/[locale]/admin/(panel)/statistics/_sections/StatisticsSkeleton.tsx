export function StatisticsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="mb-4 animate-pulse overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-5 py-4">
        <div className="h-4 w-40 rounded bg-zinc-200" />
      </div>
      <div className="flex flex-col gap-3 p-5">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-8 rounded bg-zinc-100" style={{ width: `${70 + (i % 3) * 10}%` }} />
        ))}
      </div>
    </div>
  );
}
