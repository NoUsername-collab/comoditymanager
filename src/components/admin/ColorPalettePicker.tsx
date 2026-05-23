"use client";

import { useEffect, useState } from "react";
import {
  BUILDING_COLOR_PALETTE,
  defaultColorForAcMode,
} from "@/lib/building-color-palette";

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
  const [value, setValue] = useState(
    () =>
      defaultValue ??
      (acMode ? defaultColorForAcMode(acMode) : BUILDING_COLOR_PALETTE[0].hex)
  );

  useEffect(() => {
    if (acMode) {
      setValue(defaultColorForAcMode(acMode));
    }
  }, [acMode]);

  const selected = BUILDING_COLOR_PALETTE.find(
    (c) => c.hex.toLowerCase() === value.toLowerCase()
  );

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-zinc-800">
        Culoare în calendar
      </legend>
      <input type="hidden" name={name} value={value} />

      <div className="flex flex-wrap gap-2.5" role="listbox" aria-label="Paletă culori">
        {BUILDING_COLOR_PALETTE.map((c) => {
          const active = c.hex.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={c.hex}
              type="button"
              role="option"
              aria-selected={active}
              title={c.label}
              onClick={() => setValue(c.hex)}
              className={[
                "relative h-10 w-10 rounded-full border-2 shadow-sm transition hover:scale-110",
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
          {selected?.label ?? "Culoare"} — <code className="text-xs">{value}</code>
        </span>
      </div>
    </fieldset>
  );
}
