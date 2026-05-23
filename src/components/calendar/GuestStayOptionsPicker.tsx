"use client";

import type { GuestStayOption, GuestStayPreview } from "@/domain/availability/guest-stay-options";
import { formatStayPeriod } from "@/lib/ro-calendar";

function formatRon(n: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 0,
  }).format(n);
}

export function GuestStayOptionsPicker({
  preview,
  selectedId,
  onSelect,
}: {
  preview: GuestStayPreview;
  selectedId: string | null;
  onSelect: (option: GuestStayOption) => void;
}) {
  if (!preview.can_host) {
    return (
      <div className="public-notice public-notice--warn">
        {preview.message ?? "Nu există variante pentru perioada aleasă."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="public-notice">
        <p className="font-semibold">
          {preview.options.length === 1
            ? "1 variantă disponibilă"
            : `${preview.options.length} variante disponibile`}
        </p>
        <p className="mt-1 opacity-90">
          {formatStayPeriod(preview.check_in, preview.check_out)} ·{" "}
          {preview.guest_count} pers. · {preview.nights} nopți · estimare — nu
          e plată online
        </p>
      </div>

      <div className="space-y-2">
        {preview.options.map((opt) => {
          const selected = selectedId === opt.option_id;
          return (
            <button
              key={opt.option_id}
              type="button"
              onClick={() => onSelect(opt)}
              className={[
                "public-option-card",
                selected && "public-option-card--selected",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[var(--site-fg)]">
                    {opt.title}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--site-muted)]">
                    {opt.subtitle}
                  </p>
                  <ul className="mt-2 space-y-0.5 text-xs text-[var(--site-muted)]">
                    {opt.rooms.map((r) => (
                      <li key={r.id}>
                        {r.name}
                        {r.building_name ? ` · ${r.building_name}` : ""} —{" "}
                        {formatRon(r.price_per_night)}/noapte
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="shrink-0 text-right">
                  <p className="public-option-card__price">
                    {formatRon(opt.total_estimate_ron)}
                  </p>
                  <p className="text-[10px] text-[var(--site-muted)]">
                    total estimat
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--site-muted)]">
                    {formatRon(opt.price_per_night)}/noapte
                  </p>
                </div>
              </div>
              {selected && (
                <p className="mt-2 text-xs font-semibold text-[var(--site-accent)]">
                  ✓ Varianta aleasă
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
