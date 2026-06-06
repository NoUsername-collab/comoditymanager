"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";

type Props = {
  cereriCount: number;
  arrivalsCount: number;
  departuresCount: number;
  cleanCount: number;
};

const Badge = ({
  count,
  label,
  bg,
  border,
  color,
  pulse,
}: {
  count: number;
  label: string;
  bg: string;
  border: string;
  color: string;
  pulse?: boolean;
}) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${bg} ${border} ${color} ${pulse && count > 0 ? "animate-pulse" : ""}`}
  >
    <strong className="text-[11px]">{count}</strong> {label}
  </span>
);

export function AdminTodayBar({
  cereriCount,
  arrivalsCount,
  departuresCount,
  cleanCount,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex items-center gap-1">
      {/* Badges — visible when collapsed */}
      {!expanded && (
        <div className="flex items-center gap-1">
          <Badge
            count={cereriCount}
            label="new"
            bg="bg-red-400/30"
            border="border border-red-400/60"
            color="text-red-900"
            pulse
          />
          <Badge
            count={arrivalsCount}
            label="in"
            bg="bg-emerald-400/30"
            border="border border-emerald-400/55"
            color="text-emerald-900"
          />
          <Badge
            count={departuresCount}
            label="out"
            bg="bg-amber-400/30"
            border="border border-amber-400/55"
            color="text-amber-900"
          />
          <Badge
            count={cleanCount}
            label="clean"
            bg="bg-indigo-400/30"
            border="border border-indigo-400/55"
            color="text-indigo-900"
          />
        </div>
      )}

      {/* Action links — visible when expanded */}
      {expanded && (
        <div className="flex items-center gap-1">
          <Link
            href="/admin/bookings"
            className="inline-flex items-center gap-1 rounded-full bg-red-500/40 px-2.5 py-0.5 text-[10px] font-bold text-red-900 border border-red-500/60 hover:brightness-110 no-underline"
          >
            Cereri ({cereriCount})
          </Link>
          <Link
            href="/admin/cazari"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-900 border border-emerald-500/60 hover:brightness-110 no-underline"
          >
            Check-in ({arrivalsCount})
          </Link>
          <Link
            href="/admin/cazari?tab=departures"
            className="inline-flex items-center gap-1 rounded-full bg-amber-500/40 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-500/60 hover:brightness-110 no-underline"
          >
            Check-out ({departuresCount})
          </Link>
          <Link
            href="/admin/cazari?tab=clean"
            className="inline-flex items-center gap-1 rounded-full bg-indigo-500/40 px-2.5 py-0.5 text-[10px] font-bold text-indigo-900 border border-indigo-500/60 hover:brightness-110 no-underline"
          >
            Curățenie ({cleanCount})
          </Link>
        </div>
      )}

      {/* Toggle arrow */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/10 text-zinc-300 hover:bg-white/20 shrink-0"
        title={expanded ? "Ascunde" : "Acțiuni rapide"}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
