"use client";

import type { GuestStayOption, GuestStayPreview } from "@/domain/availability/guest-stay-options";
import { validateOptionSelection } from "@/domain/availability/option-selection-guard";
import { OptionCardCompact } from "./OptionCardCompact";
import { useTranslations } from "next-intl";

type Props = {
  preview: GuestStayPreview;
  selectedId: string | null;
  onSelect: (option: GuestStayOption) => void;
};

/**
 * Compact Option Picker
 *
 * Replaces GuestStayOptionsPicker with:
 * - Compact card display (50% smaller)
 * - Clean validation (using domain guards)
 * - NO spaghetti, DDD-clean
 */
export function GuestStayOptionsPickerCompact({
  preview,
  selectedId,
  onSelect,
}: Props) {
  const t = useTranslations("public.form");

  if (!preview.can_host) {
    return (
      <div className="public-notice public-notice--warn">
        {preview.message ?? t("noOptions")}
      </div>
    );
  }

  const selected = preview.options.find((o) => o.option_id === selectedId);
  const validation = validateOptionSelection(selected ?? null, preview.guest_count);

  return (
    <div className="guest-options-picker-compact">
      <div className="public-notice">
        <p className="font-semibold">
          {preview.options.length === 1
            ? t("oneOption")
            : t("manyOptions", { count: preview.options.length })}
        </p>
        <p className="mt-1 opacity-90">
          {preview.guest_count} {preview.guest_count === 1 ? "guest" : "guests"} •{" "}
          {preview.nights} {preview.nights === 1 ? "night" : "nights"}
        </p>
      </div>

      {/* Compact grid of options */}
      <div className="guest-options-picker-compact__grid">
        {preview.options.map((opt) => (
          <OptionCardCompact
            key={opt.option_id}
            option={opt}
            isSelected={selectedId === opt.option_id}
            onSelect={() => onSelect(opt)}
            guestCount={preview.guest_count}
          />
        ))}
      </div>

      {/* Validation hint */}
      {selected && !validation.valid && (
        <div className="public-notice public-notice--warn">
          {validation.reason}
        </div>
      )}
    </div>
  );
}
