"use client";

import { useLocale, useTranslations } from "next-intl";
import type {
  GuestStayOption,
  GuestStayPreview,
} from "@/domain/availability/guest-stay-options";
import { minorCount } from "@/domain/availability/party";
import type { RoomPlacement } from "@/domain/availability/stay-capacity";
import { formatStayPeriod } from "@/lib/ro-calendar";

function formatRon(value: number, locale: string): string {
  return value.toLocaleString(locale, { maximumFractionDigits: 0 });
}

/**
 * Every option already hosts the whole family under the property's child
 * rules, so the guest picks a variant instead of counting rooms.
 */
export function GuestStayOptionPicker({
  preview,
  selectedOptionId,
  onSelect,
  onBack,
}: {
  preview: GuestStayPreview;
  selectedOptionId: string | null;
  onSelect: (option: GuestStayOption) => void;
  onBack: () => void;
}) {
  const t = useTranslations("public.form");
  const tParty = useTranslations("party");
  const locale = useLocale();

  /** "2 adults + 2 children · 1 extra bed · 1 cot" */
  function placementLabel(p: RoomPlacement): string {
    const children = minorCount(p);
    const people = [
      p.adults > 0 ? tParty("roomAdults", { count: p.adults }) : null,
      children > 0 ? tParty("roomChildren", { count: children }) : null,
    ]
      .filter(Boolean)
      .join(" + ");
    return [
      people,
      p.extraBeds > 0 ? tParty("extraBedsCount", { count: p.extraBeds }) : null,
      p.cots > 0 ? tParty("cotsCount", { count: p.cots }) : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--site-muted)]">
        {t("previewMeta", {
          period: formatStayPeriod(preview.check_in, preview.check_out, locale, true),
          guests: preview.guest_count,
          nights: preview.nights,
        })}
      </p>

      {preview.options.length === 0 ? (
        <p className="public-notice p-3 text-sm" role="alert">
          {preview.reason === "no_fit" ? tParty("noFit") : t("noOptions")}
        </p>
      ) : (
        <>
          <p className="text-sm font-medium text-[var(--site-fg)]">
            {preview.options.length === 1
              ? t("oneOption")
              : t("manyOptions", { count: preview.options.length })}
          </p>
          <ul className="space-y-2">
            {preview.options.map((option) => {
              const selected = option.option_id === selectedOptionId;
              const together = option.rooms.length === 1 && preview.party.childAges.length > 0;
              return (
                <li key={option.option_id}>
                  <button
                    type="button"
                    onClick={() => onSelect(option)}
                    aria-pressed={selected}
                    className={[
                      "site-card w-full space-y-2 p-3 text-left transition-colors",
                      selected
                        ? "border-2 border-[var(--site-accent)]"
                        : "border border-[var(--site-border)] hover:border-[var(--site-accent)]",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--site-fg)]">
                          {option.rooms.length === 1
                            ? option.rooms[0].name
                            : tParty("roomsCount", { count: option.rooms.length })}
                        </p>
                        {together && (
                          <p className="text-xs font-medium text-[var(--site-accent)]">
                            {tParty("familyTogether")}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold text-[var(--site-fg)]">
                          {formatRon(option.total_estimate_ron, locale)} RON
                        </p>
                        <p className="text-xs text-[var(--site-muted)]">
                          {t("totalEstimateLabel")}
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-1 text-sm text-[var(--site-muted)]">
                      {option.rooms.map((room, index) => (
                        <li key={room.id}>
                          <span className="text-[var(--site-fg)]">{room.name}</span>
                          {room.building_name ? ` · ${room.building_name}` : ""}
                          {option.placement[index]
                            ? ` · ${placementLabel(option.placement[index])}`
                            : ""}
                          {room.has_ac ? " · AC" : ""}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-[var(--site-muted)]">
                      {t("perNight", { price: `${formatRon(option.price_per_night, locale)} RON` })}
                      {option.extras_total_ron > 0
                        ? ` · ${tParty("extrasIncluded", { total: formatRon(option.extras_total_ron, locale) })}`
                        : ""}
                      {selected ? ` · ${t("selectedMark")}` : ""}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <button type="button" onClick={onBack} className="site-btn-secondary">
        {t("changeDates")}
      </button>
    </div>
  );
}
