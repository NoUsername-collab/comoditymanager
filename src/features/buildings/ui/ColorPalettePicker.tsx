"use client";

import { useState } from "react";
import {
  BUILDING_COLOR_PALETTE,
  canonicalHexColor,
  defaultColorForAcMode,
} from "@/lib/building-color-palette";
import { useTranslations } from "next-intl";

type Props = {
  name?: string;
  defaultValue?: string | null;
  /** Schimbă culoarea sugerată când se schimbă politica AC */
  acMode?: "all_rooms" | "none" | "per_room";
};

export function ColorPalettePicker({
  name = "color_hex",
  defaultValue,
  acMode,
}: Props) {
  const tCommon = useTranslations("admin.common");
  const tBuildings = useTranslations("admin.buildings");
  const [pickedHex, setPickedHex] = useState<string | null>(null);
  const [pickedForAcMode, setPickedForAcMode] = useState(acMode);

  const autoForAcMode = acMode
    ? defaultColorForAcMode(acMode)
    : BUILDING_COLOR_PALETTE[0].hex;

  const savedHex = canonicalHexColor(defaultValue);

  const value =
    pickedHex && acMode === pickedForAcMode
      ? pickedHex
      : !pickedHex && savedHex != null
        ? savedHex
        : autoForAcMode;

  const selected = BUILDING_COLOR_PALETTE.find(
    (c) => c.hex.toLowerCase() === value.toLowerCase()
  );

  return (
    <fieldset className="color-palette-picker space-y-3">
      <legend className="text-sm font-medium text-zinc-800">
        {tBuildings("calendarColor")}
      </legend>
      <input type="hidden" name={name} value={value} />

      <div className="flex flex-wrap gap-2.5" role="listbox" aria-label={tBuildings("colorPalette")}>
        {BUILDING_COLOR_PALETTE.map((c) => {
          const active = c.hex.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={c.hex}
              type="button"
              role="option"
              aria-selected={active}
              title={c.label}
              onClick={() => {
                setPickedHex(c.hex);
                setPickedForAcMode(acMode);
              }}
              className={[
                "color-palette-picker__swatch relative h-10 w-10 rounded-full border-2 shadow-sm transition hover:scale-110",
                active
                  ? "border-zinc-900 ring-2 ring-zinc-400 ring-offset-2"
                  : "border-white ring-1 ring-zinc-200",
              ].join(" ")}
              style={{ backgroundColor: c.hex }}
            >
              {active && (
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white drop-shadow-md">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-sm text-zinc-600">
        <span
          className="h-5 w-5 shrink-0 rounded-full border border-zinc-200 shadow-inner"
          style={{ backgroundColor: value }}
        />
        <span>
          {selected?.label ?? tCommon("color")} — <code className="text-xs">{value}</code>
        </span>
      </div>
    </fieldset>
  );
}
