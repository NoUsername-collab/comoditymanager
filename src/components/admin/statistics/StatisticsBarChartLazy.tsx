"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const StatisticsBarChart = dynamic(
  () =>
    import("./StatisticsBarChart").then((m) => ({
      default: m.StatisticsBarChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="statistics-bar-chart statistics-bar-chart--loading rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm ring-1 ring-zinc-900/5"
        aria-hidden
      >
        <div className="h-4 w-2/5 animate-pulse rounded bg-zinc-100" />
        <div className="mt-4 flex h-24 items-end gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex-1 animate-pulse rounded-t bg-zinc-100"
              style={{ height: `${30 + i * 12}%` }}
            />
          ))}
        </div>
      </div>
    ),
  }
);

export function StatisticsBarChartLazy(
  props: ComponentProps<typeof StatisticsBarChart>
) {
  return <StatisticsBarChart {...props} />;
}
