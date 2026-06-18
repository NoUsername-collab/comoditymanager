"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { updateBookingRulesSettingsAction } from "@/app/[locale]/admin/(panel)/settings/actions";
import {
  settingsPartialChanged,
  useSettingsSaveFeedback,
} from "@/hooks/useSettingsSaveFeedback";
import {
  buildCancellationPolicyText,
  type BookingRulesSettings,
  type CancellationPolicyType,
  type PricingSeason,
  type WeekendPricingMode,
} from "@/domain/settings/booking-rules";

type Props = {
  settings: BookingRulesSettings;
  locale: "ro" | "en" | "bg";
};

function newSeasonId(): string {
  return `season-${Date.now().toString(36)}`;
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="checkin-setting-row">
      <div className="checkin-setting-row__left">
        <span className="checkin-setting-row__label">{label}</span>
        {description ? (
          <span className="checkin-setting-row__desc">{description}</span>
        ) : null}
      </div>
      <div className="checkin-setting-row__right">{children}</div>
    </div>
  );
}

export function BookingRulesSettingsPanel({
  settings: initial,
  locale,
}: Props) {
  const t = useTranslations("admin.pages.settings.booking");
  const { notifySuccess, notifyError } = useSettingsSaveFeedback();
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState(initial);

  const policyPreview = useMemo(
    () => buildCancellationPolicyText(settings, locale),
    [settings, locale]
  );

  function save(partial: Partial<BookingRulesSettings>) {
    if (!settingsPartialChanged(settings, partial)) return;

    const previous = settings;
    const updated = { ...settings, ...partial };
    setSettings(updated);

    void (async () => {
      setIsSaving(true);
      try {
        const fd = new FormData();
        if (partial.cancellationPolicyType !== undefined) {
          fd.set("cancellation_policy_type", partial.cancellationPolicyType);
        }
        if (partial.cancellationPolicyDays !== undefined) {
          fd.set("cancellation_policy_days", String(partial.cancellationPolicyDays));
        }
        if (partial.cancellationPolicyCustomText !== undefined) {
          fd.set(
            "cancellation_policy_custom_text",
            partial.cancellationPolicyCustomText ?? ""
          );
        }
        if (partial.pricingWeekendEnabled !== undefined) {
          fd.set("pricing_weekend_enabled", partial.pricingWeekendEnabled ? "1" : "0");
        }
        if (partial.pricingWeekendMode !== undefined) {
          fd.set("pricing_weekend_mode", partial.pricingWeekendMode);
        }
        if (partial.pricingWeekendMultiplier !== undefined) {
          fd.set(
            "pricing_weekend_multiplier",
            String(partial.pricingWeekendMultiplier)
          );
        }
        if (partial.pricingSeasons !== undefined) {
          fd.set("pricing_seasons", JSON.stringify(partial.pricingSeasons));
        }
        if (partial.invoiceSeries !== undefined) {
          fd.set("invoice_series", partial.invoiceSeries);
        }
        if (partial.invoiceSellerRegCom !== undefined) {
          fd.set("invoice_seller_reg_com", partial.invoiceSellerRegCom ?? "");
        }

        const result = await updateBookingRulesSettingsAction(fd);
        if (result.ok) {
          notifySuccess(t("saved"));
        } else {
          notifyError(result.error ?? t("saveError"));
          setSettings(previous);
        }
      } catch (e) {
        notifyError(
          t("saveError"),
          e instanceof Error ? e.message : undefined
        );
        setSettings(previous);
      } finally {
        setIsSaving(false);
      }
    })();
  }

  function updateSeason(index: number, patch: Partial<PricingSeason>) {
    const next = settings.pricingSeasons.map((season, i) =>
      i === index ? { ...season, ...patch } : season
    );
    save({ pricingSeasons: next });
  }

  function addSeason() {
    if (settings.pricingSeasons.length >= 8) return;
    save({
      pricingSeasons: [
        ...settings.pricingSeasons,
        {
          id: newSeasonId(),
          name: t("seasonDefaultName"),
          startMonth: 6,
          startDay: 1,
          endMonth: 8,
          endDay: 31,
          multiplier: 1.2,
        },
      ],
    });
  }

  function removeSeason(index: number) {
    save({
      pricingSeasons: settings.pricingSeasons.filter((_, i) => i !== index),
    });
  }

  const weekendPercent = Math.round((settings.pricingWeekendMultiplier - 1) * 100);

  return (
    <div className="checkin-settings">
      <h3 className="checkin-settings__title">{t("cancellationTitle")}</h3>

      <SettingRow label={t("policyType")} description={t("policyTypeDesc")}>
        <select
          className="checkin-field__input"
          value={settings.cancellationPolicyType}
          onChange={(e) =>
            save({
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
            value={settings.cancellationPolicyDays}
            onChange={(e) =>
              save({
                cancellationPolicyDays: Math.min(
                  90,
                  Math.max(0, Number(e.target.value) || 0)
                ),
              })
            }
          />
        </SettingRow>
      ) : null}

      {settings.cancellationPolicyType === "custom" ? (
        <SettingRow label={t("policyCustomText")} description={t("policyCustomTextDesc")}>
          <textarea
            className="checkin-field__input checkin-field__input--wide"
            rows={4}
            value={settings.cancellationPolicyCustomText ?? ""}
            onChange={(e) =>
              save({ cancellationPolicyCustomText: e.target.value || null })
            }
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
            onChange={(e) => save({ pricingWeekendEnabled: e.target.checked })}
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
                save({ pricingWeekendMode: e.target.value as WeekendPricingMode })
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
                  save({ pricingWeekendMultiplier: 1 + pct / 100 });
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
            disabled={isSaving || settings.pricingSeasons.length >= 8}
          >
            {t("addSeason")}
          </button>
        </div>

        {settings.pricingSeasons.length === 0 ? (
          <p className="settings-season-empty">{t("seasonsEmpty")}</p>
        ) : (
          <div className="settings-season-list">
            {settings.pricingSeasons.map((season, index) => (
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
    </div>
  );
}
