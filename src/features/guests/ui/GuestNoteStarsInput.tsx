"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

function starTone(value: number, variant: "positive" | "negative"): string {
  if (variant === "negative") {
    if (value <= 1.5) return "var(--star-negative-1)";
    if (value <= 2.5) return "var(--star-negative-2)";
    if (value <= 3.5) return "var(--star-negative-3)";
    return "var(--star-negative-4)";
  }
  if (value <= 1.5) return "var(--star-positive-1)";
  if (value <= 2.5) return "var(--star-positive-2)";
  if (value <= 3.5) return "var(--star-positive-3)";
  if (value <= 4.5) return "var(--star-positive-4)";
  return "var(--star-positive-5)";
}

export function GuestNoteStarsInput({
  name,
  variant,
  defaultValue = 3,
  value: controlledValue,
  onChange,
  disabled = false,
}: {
  name?: string;
  variant: "positive" | "negative";
  defaultValue?: number;
  value?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
}) {
  const tGuests = useTranslations("admin.guests.review");
  const [internalValue, setInternalValue] = useState(
    Math.max(1, Math.min(5, Math.round(defaultValue)))
  );
  const value = controlledValue ?? internalValue;
  const tone = starTone(value, variant);
  const hintKey =
    variant === "positive" ? "positiveStarsHint" : "negativeStarsHint";

  function setValue(next: number) {
    const clamped = Math.max(1, Math.min(5, Math.round(next)));
    if (onChange) onChange(clamped);
    else setInternalValue(clamped);
  }

  return (
    <div className="guest-note-stars space-y-1">
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-zinc-600">{tGuests(hintKey)}</span>
        <span className="inline-flex items-center gap-0.5" role="group" aria-label={tGuests(hintKey)}>
          {Array.from({ length: 5 }, (_, index) => {
            const star = index + 1;
            const filled = star <= value;
            return (
              <button
                key={star}
                type="button"
                disabled={disabled}
                onClick={() => setValue(star)}
                className="rounded p-0.5 transition hover:scale-110 disabled:opacity-50"
                aria-label={tGuests("starsOption", { count: star })}
                aria-pressed={filled}
              >
                <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
                  <polygon
                    points="12,2 15,9 22,9 16.5,13.5 18.5,21 12,16.8 5.5,21 7.5,13.5 2,9 9,9"
                    fill={filled ? tone : "var(--star-empty-fill)"}
                    stroke={filled ? tone : "var(--star-empty-stroke)"}
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            );
          })}
        </span>
        <span className="text-xs text-zinc-500">
          {variant === "positive"
            ? tGuests(`positiveStarsLevel.${value}`)
            : tGuests(`negativeStarsLevel.${value}`)}
        </span>
      </div>
    </div>
  );
}
