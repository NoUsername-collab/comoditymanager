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
  /** Changes the suggested color when the AC policy changes. */
  acMode?: "all_rooms" | "none" | "per_room";
};

export function ColorPalettePicker({
  name = "color_hex",
  defaultValue,
  acMode,
}: Props) {
  const tBuildings = useTranslations("admin.buildings");
  const [pickedHex, setPickedHex] = useState<string | null>(null);
  const [pickedForAcMode, setPickedForAcMode] = useState(acMode);
  const [hexDraft, setHexDraft] = useState<string | null>(null);

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
  const draftInvalid =
    hexDraft != null && hexDraft.trim() !== "" && canonicalHexColor(hexDraft) == null;

  function choose(hex: string) {
    setPickedHex(hex);
    setPickedForAcMode(acMode);
    setHexDraft(null);
  }

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
              onClick={() => choose(c.hex)}
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

      <div className="color-palette-picker__custom-row flex items-center gap-2">
        <input
          type="color"
          value={value}
          aria-label={tBuildings("customColor")}
          onChange={(event) => {
            const hex = canonicalHexColor(event.target.value);
            if (hex) choose(hex);
          }}
          className={[
            "color-palette-picker__custom h-10 w-14 shrink-0 cursor-pointer rounded-full border-2 bg-white p-0.5 shadow-sm",
            selected
              ? "border-white ring-1 ring-zinc-200"
              : "border-zinc-900 ring-2 ring-zinc-400 ring-offset-2",
          ].join(" ")}
        />
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          maxLength={7}
          value={hexDraft ?? value}
          aria-label={tBuildings("hexColor")}
          aria-invalid={draftInvalid}
          onChange={(event) => {
            const next = event.target.value;
            const hex = canonicalHexColor(next);
            if (hex) {
              setPickedHex(hex);
              setPickedForAcMode(acMode);
              setHexDraft(hex === next.trim().toLowerCase() ? null : next);
              return;
            }
            setHexDraft(next);
          }}
          onBlur={() => setHexDraft(null)}
          className={[
            "color-palette-picker__hex w-28 rounded-md border px-2 py-1.5 font-mono text-sm text-zinc-800",
            draftInvalid ? "border-red-400" : "border-zinc-200",
          ].join(" ")}
        />
        <span className="text-sm text-zinc-600">
          {selected?.label ?? tBuildings("customColorLabel")}
        </span>
      </div>
    </fieldset>
  );
}
