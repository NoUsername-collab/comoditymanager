"use client";

import type { GuestStayOption } from "@/domain/availability/guest-stay-options";
import { canSelectOption } from "@/domain/availability/option-selection-guard";
import { useLocale } from "next-intl";

type Props = {
  option: GuestStayOption;
  isSelected: boolean;
  onSelect: () => void;
  guestCount: number;
};

function formatMoney(locale: string, n: number): string {
  const tag = locale === "bg" ? "bg-BG" : locale === "en" ? "en-GB" : "ro-RO";
  return new Intl.NumberFormat(tag, {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Compact Option Card
 *
 * Renders a single booking option in compact form.
 * - 50% smaller than original
 * - Shows: title, room count, price, selection indicator
 * - Validates capacity against guest count
 */
export function OptionCardCompact({
  option,
  isSelected,
  onSelect,
  guestCount,
}: Props) {
  const locale = useLocale();
  const validation = canSelectOption(option, guestCount);
  const isSelectable = validation.valid;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!isSelectable}
      className={[
        "option-card-compact",
        isSelected && "option-card-compact--selected",
        !isSelectable && "option-card-compact--disabled",
      ]
        .filter(Boolean)
        .join(" ")}
      title={!isSelectable ? validation.reason : undefined}
    >
      {/* Header: Title + Price */}
      <div className="option-card-compact__header">
        <div className="option-card-compact__title-wrap">
          <p className="option-card-compact__title">{option.title}</p>
          <p className="option-card-compact__subtitle">{option.rooms.length} camere</p>
        </div>
        <span className="option-card-compact__price">
          {formatMoney(locale, option.total_estimate_ron)}
        </span>
      </div>

      {/* Room list (compact) */}
      <ul className="option-card-compact__rooms">
        {option.rooms.slice(0, 2).map((r) => (
          <li key={r.id} className="option-card-compact__room-item">
            {r.name}
            {option.rooms.length > 2 && option.rooms.indexOf(r) === 1 && (
              <span className="option-card-compact__more">
                +{option.rooms.length - 2}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* Selection indicator */}
      <div className="option-card-compact__indicator">
        {isSelected ? "✓" : "○"}
      </div>

      {/* Disabled hint */}
      {!isSelectable && (
        <div className="option-card-compact__disabled-hint">
          {validation.reason}
        </div>
      )}
    </button>
  );
}
