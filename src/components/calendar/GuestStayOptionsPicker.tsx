"use client";

import type { GuestStayOption, GuestStayPreview } from "@/domain/availability/guest-stay-options";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { useLocale, useTranslations } from "next-intl";

function formatMoney(locale: string, n: number): string {
  const tag = locale === "bg" ? "bg-BG" : locale === "en" ? "en-GB" : "ro-RO";
  return new Intl.NumberFormat(tag, {
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
  const t = useTranslations("public.form");
  const locale = useLocale();

  if (!preview.can_host) {
    return (
      <div className="public-notice public-notice--warn">
        {preview.message ?? t("noOptions")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="public-notice">
        <p className="font-semibold">
          {preview.options.length === 1
            ? t("oneOption")
            : t("manyOptions", { count: preview.options.length })}
        </p>
        <p className="mt-1 opacity-90">
          {t("previewMeta", {
            period: formatStayPeriod(preview.check_in, preview.check_out),
            guests: preview.guest_count,
            nights: preview.nights,
          })}
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
                        {t("perNight", {
                          price: formatMoney(locale, r.price_per_night),
                        })}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="shrink-0 text-right">
                  <p className="public-option-card__price">
                    {formatMoney(locale, opt.total_estimate_ron)}
                  </p>
                  <p className="text-[10px] text-[var(--site-muted)]">
                    {t("totalEstimateLabel")}
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--site-muted)]">
                    {t("perNight", {
                      price: formatMoney(locale, opt.price_per_night),
                    })}
                  </p>
                </div>
              </div>
              {selected && (
                <p className="mt-2 text-xs font-semibold text-[var(--site-accent)]">
                  {t("selectedMark")}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
