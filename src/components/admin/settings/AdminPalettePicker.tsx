"use client";

import { useMemo, useState } from "react";
import {
  CATALOG_PALETTES,
  SEASON_PALETTES,
  getCurrentSeason,
  getSeasonLabel,
  resolvePaletteDefinition,
  tokensFor,
  type AdminPaletteDefinition,
  type AdminPaletteSettings,
  type AdminPaletteSource,
} from "@/lib/admin-palettes";
import { useAdminTheme } from "@/components/admin/AdminAppearanceProvider";
import type { AdminTheme } from "@/lib/admin-theme";
import { SettingsSlidePanel } from "@/components/admin/settings/SettingsSlidePanel";

function ZoneStrip({
  palette,
  mode,
  compact,
}: {
  palette: AdminPaletteDefinition;
  mode: AdminTheme;
  compact?: boolean;
}) {
  const t = tokensFor(palette, mode);
  return (
    <div
      className={[
        "admin-palette-zones",
        compact && "admin-palette-zones--compact",
      ]
        .filter(Boolean)
        .join(" ")}
      title={mode === "day" ? "Zi" : "Noapte"}
    >
      <span
        className="admin-palette-zones__checkout h-full"
        style={{ background: t.ganttZoneCheckout }}
      />
      <span
        className="admin-palette-zones__clean h-full"
        style={{
          background: `repeating-linear-gradient(-45deg, ${t.ganttZoneClean}, ${t.ganttZoneClean} 4px, rgba(0,0,0,0.07) 4px, rgba(0,0,0,0.07) 6px)`,
        }}
      />
      <span
        className="admin-palette-zones__checkin h-full"
        style={{ background: t.ganttZoneCheckin }}
      />
    </div>
  );
}

function ExtendedPalettePreview({
  palette,
}: {
  palette: AdminPaletteDefinition;
}) {
  return (
    <div className="admin-palette-extend">
      <p className="admin-palette-extend__desc">{palette.description}</p>
      <div className="admin-palette-extend__modes">
        {(["day", "night"] as const).map((mode) => {
          const t = tokensFor(palette, mode);
          return (
            <div key={mode}>
              <p className="admin-palette-extend__mode-label">
                {mode === "day" ? "☀️ Zi" : "🌙 Noapte"}
              </p>
              <ZoneStrip palette={palette} mode={mode} />
              <div className="admin-palette-tokens mt-2">
                {(
                  [
                    ["Fundal", t.pageBg],
                    ["Panou", t.panelBg],
                    ["Accent", t.accent],
                    ["Text", t.text],
                  ] as const
                ).map(([label, color]) => (
                  <div key={label} className="admin-palette-token">
                    <div
                      className="admin-palette-token__swatch"
                      style={{ background: color }}
                    />
                    <p className="admin-palette-token__label">{label}</p>
                  </div>
                ))}
              </div>
              <div
                className="admin-palette-extend__hud mt-2"
                style={{ background: t.hudGradient }}
                title="HUD / header"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaletteThemeRow({
  palette,
  selected,
  expanded,
  onToggleExpand,
  onSelect,
}: {
  palette: AdminPaletteDefinition;
  selected: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
}) {
  return (
    <article
      className={[
        "admin-palette-theme",
        selected && "admin-palette-theme--selected",
        expanded && "admin-palette-theme--open",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="admin-palette-theme__head"
        aria-expanded={expanded}
        onClick={onToggleExpand}
      >
        <span className="admin-palette-theme__name">
          {palette.seasonEmoji && (
            <span className="mr-1">{palette.seasonEmoji}</span>
          )}
          {palette.name}
        </span>
        {!expanded && (
          <span className="admin-palette-theme__strip">
            <ZoneStrip palette={palette} mode="day" compact />
          </span>
        )}
        {selected && (
          <span className="admin-palette-theme__badge">Activ</span>
        )}
        <span className="admin-palette-theme__chevron" aria-hidden>
          ▾
        </span>
      </button>

      <div
        className={[
          "admin-palette-theme__body",
          expanded && "admin-palette-theme__body--open",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="admin-palette-theme__inner">
          <ExtendedPalettePreview palette={palette} />
          {!selected && (
            <button
              type="button"
              className="admin-palette-extend__apply mt-3"
              onClick={onSelect}
            >
              Alege această temă
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function AdminPalettePicker({
  defaultSettings,
}: {
  defaultSettings: AdminPaletteSettings;
}) {
  const [source, setSource] = useState<AdminPaletteSource>(
    defaultSettings.admin_palette_source
  );
  const [paletteKey, setPaletteKey] = useState(
    defaultSettings.admin_palette_key
  );
  const [dayNight, setDayNight] = useState<AdminTheme>(
    defaultSettings.admin_day_night
  );
  const [expandedId, setExpandedId] = useState<string | null>(
    defaultSettings.admin_palette_key
  );

  const { applySettings, settings } = useAdminTheme();

  const preview = (next: Partial<AdminPaletteSettings>) => {
    const merged: AdminPaletteSettings = {
      admin_palette_source: next.admin_palette_source ?? source,
      admin_palette_key: next.admin_palette_key ?? paletteKey,
      admin_day_night: next.admin_day_night ?? dayNight,
    };
    applySettings(merged);
  };

  const currentSeason = useMemo(() => getCurrentSeason(), []);

  const activePalette = useMemo(
    () => resolvePaletteDefinition(settings),
    [settings]
  );

  const visiblePalettes = useMemo(() => {
    if (source === "catalog") return CATALOG_PALETTES;
    if (source === "season_auto") {
      return SEASON_PALETTES.filter((p) => p.id === currentSeason);
    }
    return SEASON_PALETTES;
  }, [source, currentSeason]);

  const selectPalette = (id: string) => {
    setPaletteKey(id);
    setExpandedId(id);
    preview({ admin_palette_key: id });
  };

  return (
    <div className="admin-palette-picker">
      <input type="hidden" name="admin_palette_source" value={source} />
      <input type="hidden" name="admin_palette_key" value={paletteKey} />
      <input type="hidden" name="admin_day_night" value={dayNight} />

      <SettingsSlidePanel
        title="Mod zi / noapte"
        subtitle={
          dayNight === "day"
            ? "Aspect luminos activ"
            : "Aspect întunecat activ"
        }
        icon={dayNight === "day" ? "☀️" : "🌙"}
        defaultOpen
      >
        <div className="admin-palette-block">
          <p className="admin-palette-block__desc">
            Fiecare temă are variantă Zi și Noapte — previzualizarea live se
            aplică imediat în panou.
          </p>
          <div className="admin-palette-daynight">
            {(["day", "night"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setDayNight(m);
                  preview({ admin_day_night: m });
                }}
                className={[
                  "admin-palette-daynight__btn",
                  dayNight === m && "admin-palette-daynight__btn--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {m === "day" ? "☀️ Zi" : "🌙 Noapte"}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <p className="admin-palette-extend__mode-label">Tema activă</p>
            <ZoneStrip palette={activePalette} mode={dayNight} />
          </div>
        </div>
      </SettingsSlidePanel>

      <SettingsSlidePanel
        title="Sursă paletă"
        subtitle={
          source === "catalog"
            ? "11 stiluri generale"
            : source === "season_auto"
              ? `Anotimp auto — ${getSeasonLabel(currentSeason)}`
              : "Anotimp ales manual"
        }
        icon="🎨"
      >
        <div className="admin-palette-block">
          <div className="admin-palette-source">
            {(
              [
                ["catalog", "11 stiluri generale"],
                ["season_auto", `Auto (${getSeasonLabel(currentSeason)})`],
                ["season_manual", "Anotimp ales"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setSource(value);
                  let key = paletteKey;
                  if (value === "catalog") {
                    key = CATALOG_PALETTES.some((p) => p.id === paletteKey)
                      ? paletteKey
                      : "pension";
                  } else if (value === "season_auto") {
                    key = currentSeason;
                  } else {
                    key = SEASON_PALETTES.some((p) => p.id === paletteKey)
                      ? paletteKey
                      : currentSeason;
                  }
                  setPaletteKey(key);
                  setExpandedId(key);
                  preview({
                    admin_palette_source: value,
                    admin_palette_key: key,
                  });
                }}
                className={[
                  "admin-palette-source__btn",
                  source === value && "admin-palette-source__btn--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
          {source === "season_auto" && (
            <p className="admin-palette-block__desc mt-3">
              Acum în România: <strong>{getSeasonLabel(currentSeason)}</strong>{" "}
              — paleta se schimbă automat la fiecare anotimp.
            </p>
          )}
        </div>
      </SettingsSlidePanel>

      <SettingsSlidePanel
        title="Tonuri & teme"
        subtitle={`${activePalette.name} · click pe nume pentru preview`}
        icon="✨"
        badge={
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600">
            {visiblePalettes.length}{" "}
            {visiblePalettes.length === 1 ? "temă" : "teme"}
          </span>
        }
        defaultOpen
      >
        <div className="admin-palette-list">
          {visiblePalettes.map((p) => (
            <PaletteThemeRow
              key={p.id}
              palette={p}
              selected={paletteKey === p.id}
              expanded={expandedId === p.id}
              onToggleExpand={() =>
                setExpandedId((prev) => (prev === p.id ? null : p.id))
              }
              onSelect={() => selectPalette(p.id)}
            />
          ))}
        </div>
      </SettingsSlidePanel>
    </div>
  );
}
