"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import "@/features/checkin/ui/import-checkin-styles";
import { updateBookingRulesSettingsAction } from "@/features/settings/actions";
import {
  settingsPartialChanged,
  useSettingsSaveFeedback,
} from "@/hooks/useSettingsSaveFeedback";
import { useSettingsDraft, type SettingsSaveResult } from "@/hooks/useSettingsDraft";
import { SettingsDraftSaveBar } from "@/components/admin/settings/SettingsDraftSaveBar";
import {
  buildCancellationPolicyText,
  buildPricingExample,
  type BookingRulesSettings,
  type CancellationPolicyType,
  type PricingSeason,
  type WeekendPricingMode,
} from "@/domain/settings/booking-rules";
import { SettingRow } from "@/components/admin/settings/SettingRow";

type Props = {
  settings: BookingRulesSettings;
  locale: "ro" | "en" | "bg";
};

function newSeasonId(): string {
  return `season-${Date.now().toString(36)}`;
}

export function BookingRulesSettingsPanel({
  settings: initial,
  locale,
}: Props) {
  const t = useTranslations("admin.pages.settings.booking");
  const tSettings = useTranslations("admin.pages.settings");
  const { notifySuccess, notifyError } = useSettingsSaveFeedback();
  const [settings, setSettings] = useState(initial);

  async function send(partial: Partial<BookingRulesSettings>): Promise<SettingsSaveResult> {
    const fd = new FormData();
    if (partial.cancellationPolicyType !== undefined) {
      fd.set("cancellation_policy_type", partial.cancellationPolicyType);
    }
    if (partial.cancellationPolicyDays !== undefined) {
      fd.set("cancellation_policy_days", String(partial.cancellationPolicyDays));
    }
    if (partial.cancellationPolicyCustomText !== undefined) {
      fd.set("cancellation_policy_custom_text", partial.cancellationPolicyCustomText ?? "");
    }
    if (partial.pricingWeekendEnabled !== undefined) {
      fd.set("pricing_weekend_enabled", partial.pricingWeekendEnabled ? "1" : "0");
    }
    if (partial.pricingWeekendMode !== undefined) {
      fd.set("pricing_weekend_mode", partial.pricingWeekendMode);
    }
    if (partial.pricingWeekendMultiplier !== undefined) {
      fd.set("pricing_weekend_multiplier", String(partial.pricingWeekendMultiplier));
    }
    if (partial.pricingSeasons !== undefined) {
      fd.set("pricing_seasons", JSON.stringify(partial.pricingSeasons));
    }
    const result = await updateBookingRulesSettingsAction(fd);
    if (result.ok) {
      setSettings((current) => ({ ...current, ...partial }));
      notifySuccess(t("saved"));
    } else {
      notifyError(t("saveError"), result.error);
    }
    return result;
  }

  /** Pickers and switches save as soon as they change. */
  function saveNow(partial: Partial<BookingRulesSettings>) {
    if (!settingsPartialChanged(settings, partial)) return;
    const previous = settings;
    setSettings((current) => ({ ...current, ...partial }));
    void send(partial).then((result) => {
      if (!result.ok) setSettings(previous);
    });
  }

  /** Typed values wait for the Save button in the bottom bar. */
  const draft = useSettingsDraft(
    {
      cancellationPolicyDays: settings.cancellationPolicyDays,
      cancellationPolicyCustomText: settings.cancellationPolicyCustomText ?? "",
      pricingWeekendMultiplier: settings.pricingWeekendMultiplier,
      pricingSeasons: settings.pricingSeasons,
    },
    (_values, changed) =>
      send({
        ...changed,
        ...(changed.cancellationPolicyCustomText !== undefined
          ? { cancellationPolicyCustomText: changed.cancellationPolicyCustomText.trim() || null }
          : {}),
      }),
  );
  const view: BookingRulesSettings = {
    ...settings,
    ...draft.values,
    cancellationPolicyCustomText: draft.values.cancellationPolicyCustomText || null,
  };

  const policyPreview = useMemo(
    () => buildCancellationPolicyText(view, locale),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- view is rebuilt each render from these
    [settings, draft.values, locale],
  );

  function updateSeason(index: number, patch: Partial<PricingSeason>) {
    draft.set(
      "pricingSeasons",
      view.pricingSeasons.map((season, i) => (i === index ? { ...season, ...patch } : season)),
    );
  }

  function addSeason() {
    if (view.pricingSeasons.length >= 8) return;
    draft.set("pricingSeasons", [
      ...view.pricingSeasons,
      {
        id: newSeasonId(),
        name: t("seasonDefaultName"),
        startMonth: 6,
        startDay: 1,
        endMonth: 8,
        endDay: 31,
        multiplier: 1.2,
      },
    ]);
  }

  function removeSeason(index: number) {
    draft.set(
      "pricingSeasons",
      view.pricingSeasons.filter((_, i) => i !== index),
    );
  }

  const weekendPercent = Math.round((view.pricingWeekendMultiplier - 1) * 100);
  const example = buildPricingExample(view);

  return (
    <div className="checkin-settings">
      <p className="checkin-settings__autosave" role="note">
        {tSettings("saveModelHint")}
      </p>
      <h3 className="checkin-settings__title">{t("cancellationTitle")}</h3>

      <SettingRow label={t("policyType")} description={t("policyTypeDesc")}>
        <select
          className="checkin-field__input"
          value={settings.cancellationPolicyType}
          onChange={(e) =>
            saveNow({
              cancellationPolicyType: e.target.value as CancellationPolicyType,
            })
          }
        >
          <option value="flexible">{t("policyFlexible")}</option>
          <option value="moderate">{t("policyModerate")}</option>
          <option value="strict">{t("policyStrict")}</option>
          <option value="custom">{t("policyCustom")}</option>
        </select>
      </SettingRow>

      {settings.cancellationPolicyType === "moderate" ? (
        <SettingRow label={t("policyDays")} description={t("policyDaysDesc")}>
          <input
            type="number"
            min={0}
            max={90}
            className="checkin-field__input checkin-field__input--narrow"
            value={view.cancellationPolicyDays}
            onChange={(e) =>
              draft.set(
                "cancellationPolicyDays",
                Math.min(90, Math.max(0, Number(e.target.value) || 0)),
              )
            }
          />
        </SettingRow>
      ) : null}

      {settings.cancellationPolicyType === "custom" ? (
        <SettingRow label={t("policyCustomText")} description={t("policyCustomTextDesc")}>
          <textarea
            className="checkin-field__input checkin-field__input--wide"
            rows={4}
            value={draft.values.cancellationPolicyCustomText}
            onChange={(e) => draft.set("cancellationPolicyCustomText", e.target.value)}
          />
        </SettingRow>
      ) : null}

      <p className="settings-policy-preview">{policyPreview}</p>

      <h3 className="checkin-settings__title">{t("pricingTitle")}</h3>

      <SettingRow label={t("weekendEnabled")} description={t("weekendEnabledDesc")}>
        <label className="checkin-toggle">
          <input
            type="checkbox"
            checked={settings.pricingWeekendEnabled}
            onChange={(e) => saveNow({ pricingWeekendEnabled: e.target.checked })}
          />
          <span>{settings.pricingWeekendEnabled ? t("enabled") : t("disabled")}</span>
        </label>
      </SettingRow>

      {settings.pricingWeekendEnabled ? (
        <>
          <SettingRow label={t("weekendMode")} description={t("weekendModeDesc")}>
            <select
              className="checkin-field__input"
              value={settings.pricingWeekendMode}
              onChange={(e) =>
                saveNow({ pricingWeekendMode: e.target.value as WeekendPricingMode })
              }
            >
              <option value="fri_sat">{t("weekendFriSat")}</option>
              <option value="sat_only">{t("weekendSatOnly")}</option>
            </select>
          </SettingRow>
          <SettingRow label={t("weekendPercent")} description={t("weekendPercentDesc")}>
            <div className="settings-percent-field">
              <input
                type="number"
                min={0}
                max={400}
                className="checkin-field__input checkin-field__input--narrow"
                value={weekendPercent}
                onChange={(e) => {
                  const pct = Math.min(400, Math.max(0, Number(e.target.value) || 0));
                  draft.set("pricingWeekendMultiplier", 1 + pct / 100);
                }}
              />
              <span>%</span>
            </div>
          </SettingRow>
        </>
      ) : null}

      <div className="settings-season-block">
        <div className="settings-season-block__head">
          <div>
            <h4 className="settings-season-block__title">{t("seasonsTitle")}</h4>
            <p className="settings-season-block__desc">{t("seasonsDesc")}</p>
          </div>
          <button
            type="button"
            className="checkin-stepper__btn checkin-stepper__btn--secondary"
            onClick={addSeason}
            disabled={view.pricingSeasons.length >= 8}
          >
            {t("addSeason")}
          </button>
        </div>

        {view.pricingSeasons.length === 0 ? (
          <p className="settings-season-empty">{t("seasonsEmpty")}</p>
        ) : (
          <div className="settings-season-list">
            {view.pricingSeasons.map((season, index) => (
              <div key={season.id} className="settings-season-card">
                <input
                  className="checkin-field__input"
                  value={season.name}
                  onChange={(e) => updateSeason(index, { name: e.target.value })}
                  placeholder={t("seasonName")}
                />
                <div className="settings-season-card__dates">
                  <label>
                    {t("seasonFrom")}
                    <input
                      type="date"
                      className="checkin-field__input"
                      value={`2024-${String(season.startMonth).padStart(2, "0")}-${String(season.startDay).padStart(2, "0")}`}
                      onChange={(e) => {
                        const [, m, d] = e.target.value.split("-");
                        updateSeason(index, {
                          startMonth: Number(m),
                          startDay: Number(d),
                        });
                      }}
                    />
                  </label>
                  <label>
                    {t("seasonTo")}
                    <input
                      type="date"
                      className="checkin-field__input"
                      value={`2024-${String(season.endMonth).padStart(2, "0")}-${String(season.endDay).padStart(2, "0")}`}
                      onChange={(e) => {
                        const [, m, d] = e.target.value.split("-");
                        updateSeason(index, {
                          endMonth: Number(m),
                          endDay: Number(d),
                        });
                      }}
                    />
                  </label>
                  <label>
                    +%
                    <input
                      type="number"
                      min={0}
                      max={400}
                      className="checkin-field__input checkin-field__input--narrow"
                      value={Math.round((season.multiplier - 1) * 100)}
                      onChange={(e) => {
                        const pct = Math.min(
                          400,
                          Math.max(0, Number(e.target.value) || 0)
                        );
                        updateSeason(index, { multiplier: 1 + pct / 100 });
                      }}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="settings-season-card__remove"
                  onClick={() => removeSeason(index)}
                >
                  {t("removeSeason")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {example.weekend !== null || example.seasons.length > 0 ? (
        <div className="settings-policy-preview" role="note">
          <p className="m-0 font-semibold">{t("exampleTitle", { base: example.base })}</p>
          <ul className="m-0 mt-1 list-disc pl-5">
            {example.weekend !== null ? (
              <li>{t("exampleWeekend", { price: example.weekend })}</li>
            ) : null}
            {example.seasons.map((season, index) => (
              <li key={`${season.name}-${index}`}>
                {season.weekend !== null
                  ? t("exampleSeasonWeekend", {
                      name: season.name || t("seasonDefaultName"),
                      price: season.weekday,
                      weekend: season.weekend,
                    })
                  : t("exampleSeason", {
                      name: season.name || t("seasonDefaultName"),
                      price: season.weekday,
                    })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <SettingsDraftSaveBar draft={draft} errorFallback={t("saveError")} />
    </div>
  );
}
