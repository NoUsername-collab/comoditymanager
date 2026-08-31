"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { updateFiscalBillingSettingsAction } from "@/features/settings/actions";
import type { CheckinSettings } from "@/domain/checkin/types";
import {
  formatFisaPropertyAddress,
  parseFisaPropertyAddress,
  type FisaPropertyAddressParts,
} from "@/domain/checkin/fisa-property-address";
import {
  getCountryFiscalProfile,
  isFiscalSellerComplete,
  resolveInvoiceVatRate,
  type TenantCountry,
} from "@/domain/fiscal/country-fiscal-profile";
import type { BookingRulesSettings } from "@/domain/settings/booking-rules";
import type { TenantFiscalSettingsRecord } from "@/lib/fiscal/anaf-config";
import {
  settingsPartialChanged,
  useSettingsSaveFeedback,
} from "@/hooks/useSettingsSaveFeedback";

type Props = {
  country: TenantCountry;
  propertyName: string;
  bookingRules: BookingRulesSettings;
  checkinSettings: CheckinSettings;
  tenantFiscalSettings: TenantFiscalSettingsRecord;
  locale: "ro" | "en" | "bg";
  readOnly?: boolean;
};

type FiscalDraft = {
  taxId: string;
  regCom: string;
  tourismLicense: string;
  addressParts: FisaPropertyAddressParts;
  invoiceSeries: string;
  vatEnabled: boolean;
  vatRate: string;
  pricesIncludeVat: boolean;
  fiscalProvider: "internal_pdf" | "anaf";
  anafEnabled: boolean;
  anafEnv: "test" | "prod";
  anafCif: string;
};

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

function buildDraft(
  bookingRules: BookingRulesSettings,
  checkinSettings: CheckinSettings,
  country: TenantCountry,
  tenantFiscalSettings: TenantFiscalSettingsRecord
): FiscalDraft {
  const profile = getCountryFiscalProfile(country);
  const effectiveRate = resolveInvoiceVatRate(
    country,
    bookingRules.invoiceVatRate
  );
  return {
    taxId: checkinSettings.fisa_owner_cui ?? "",
    regCom: bookingRules.invoiceSellerRegCom ?? "",
    tourismLicense: checkinSettings.fisa_tourism_license ?? "",
    addressParts: parseFisaPropertyAddress(checkinSettings.fisa_property_address),
    invoiceSeries: bookingRules.invoiceSeries,
    vatEnabled: bookingRules.invoiceVatEnabled,
    vatRate: String(
      bookingRules.invoiceVatRate ?? profile.defaultAccommodationVatRate
    ),
    pricesIncludeVat: bookingRules.invoicePricesIncludeVat,
    fiscalProvider: tenantFiscalSettings.provider,
    anafEnabled: tenantFiscalSettings.anafEnabled,
    anafEnv: tenantFiscalSettings.anafEnv,
    anafCif: tenantFiscalSettings.anafCif ?? "",
  };
}

export function FiscalBillingSettingsPanel({
  country,
  propertyName,
  bookingRules: initialBooking,
  checkinSettings: initialCheckin,
  tenantFiscalSettings: initialTenantFiscal,
  locale,
  readOnly = false,
}: Props) {
  const t = useTranslations("admin.pages.settings.fiscal");
  const tCheckin = useTranslations("admin.pages.settings.checkin");
  const { notifySuccess, notifyError } = useSettingsSaveFeedback();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [bookingRules, setBookingRules] = useState(initialBooking);
  const [checkinSettings, setCheckinSettings] = useState(initialCheckin);
  const [tenantFiscalSettings, setTenantFiscalSettings] =
    useState(initialTenantFiscal);
  const [draft, setDraft] = useState(() =>
    buildDraft(initialBooking, initialCheckin, country, initialTenantFiscal)
  );

  const profile = useMemo(() => getCountryFiscalProfile(country), [country]);

  const sellerComplete = isFiscalSellerComplete({
    propertyName,
    taxId: checkinSettings.fisa_owner_cui,
    regCom: bookingRules.invoiceSellerRegCom,
    address: checkinSettings.fisa_property_address,
    tourismLicense: checkinSettings.fisa_tourism_license,
  });

  const effectiveVatRate = resolveInvoiceVatRate(
    country,
    bookingRules.invoiceVatRate
  );

  function startEdit() {
    setDraft(buildDraft(bookingRules, checkinSettings, country, tenantFiscalSettings));
    setEditing(true);
  }

  function cancelEdit() {
    setSaveError(null);
    setIsSaving(false);
    setDraft(buildDraft(bookingRules, checkinSettings, country, tenantFiscalSettings));
    setEditing(false);
  }

  function saveDraft() {
    setSaveError(null);
    const address = formatFisaPropertyAddress(draft.addressParts);
    const nextBooking: Partial<BookingRulesSettings> = {};
    const nextCheckin: Partial<CheckinSettings> = {};

    if (draft.invoiceSeries !== bookingRules.invoiceSeries) {
      nextBooking.invoiceSeries = draft.invoiceSeries.toUpperCase();
    }
    if (draft.regCom !== (bookingRules.invoiceSellerRegCom ?? "")) {
      nextBooking.invoiceSellerRegCom = draft.regCom.trim() || null;
    }
    if (draft.vatEnabled !== bookingRules.invoiceVatEnabled) {
      nextBooking.invoiceVatEnabled = draft.vatEnabled;
    }
    const parsedRate = draft.vatRate.trim()
      ? Number(draft.vatRate)
      : null;
    const currentRate =
      bookingRules.invoiceVatRate ?? profile.defaultAccommodationVatRate;
    if (parsedRate !== currentRate) {
      nextBooking.invoiceVatRate = parsedRate;
    }
    if (draft.pricesIncludeVat !== bookingRules.invoicePricesIncludeVat) {
      nextBooking.invoicePricesIncludeVat = draft.pricesIncludeVat;
    }

    if (draft.taxId.trim() !== (checkinSettings.fisa_owner_cui ?? "")) {
      nextCheckin.fisa_owner_cui = draft.taxId.trim() || null;
    }
    if (
      draft.tourismLicense.trim() !==
      (checkinSettings.fisa_tourism_license ?? "")
    ) {
      nextCheckin.fisa_tourism_license = draft.tourismLicense.trim() || null;
    }
    if (address !== (checkinSettings.fisa_property_address ?? "")) {
      nextCheckin.fisa_property_address = address || null;
    }

    const nextFiscal: Partial<TenantFiscalSettingsRecord> = {};
    if (country === "RO") {
      if (draft.fiscalProvider !== tenantFiscalSettings.provider) {
        nextFiscal.provider = draft.fiscalProvider;
      }
      if (draft.anafEnabled !== tenantFiscalSettings.anafEnabled) {
        nextFiscal.anafEnabled = draft.anafEnabled;
      }
      if (draft.anafEnv !== tenantFiscalSettings.anafEnv) {
        nextFiscal.anafEnv = draft.anafEnv;
      }
      if (draft.anafCif.trim() !== (tenantFiscalSettings.anafCif ?? "")) {
        nextFiscal.anafCif = draft.anafCif.trim() || null;
      }
    }

    const bookingChanged = settingsPartialChanged(bookingRules, nextBooking);
    const checkinChanged = settingsPartialChanged(checkinSettings, nextCheckin);
    const fiscalChanged =
      country === "RO" &&
      (nextFiscal.provider !== undefined ||
        nextFiscal.anafEnabled !== undefined ||
        nextFiscal.anafEnv !== undefined ||
        nextFiscal.anafCif !== undefined);
    if (!bookingChanged && !checkinChanged && !fiscalChanged) {
      setEditing(false);
      return;
    }

    void (async () => {
      setIsSaving(true);
      try {
        const fd = new FormData();
        if (nextBooking.invoiceSeries !== undefined) {
          fd.set("invoice_series", nextBooking.invoiceSeries);
        }
        if (nextBooking.invoiceSellerRegCom !== undefined) {
          fd.set("invoice_seller_reg_com", nextBooking.invoiceSellerRegCom ?? "");
        }
        if (nextBooking.invoiceVatEnabled !== undefined) {
          fd.set("invoice_vat_enabled", nextBooking.invoiceVatEnabled ? "true" : "false");
        }
        if (nextBooking.invoiceVatRate !== undefined) {
          fd.set(
            "invoice_vat_rate",
            nextBooking.invoiceVatRate != null ? String(nextBooking.invoiceVatRate) : ""
          );
        }
        if (nextBooking.invoicePricesIncludeVat !== undefined) {
          fd.set(
            "invoice_prices_include_vat",
            nextBooking.invoicePricesIncludeVat ? "true" : "false"
          );
        }
        if (nextCheckin.fisa_owner_cui !== undefined) {
          fd.set("fisa_owner_cui", nextCheckin.fisa_owner_cui ?? "");
        }
        if (nextCheckin.fisa_tourism_license !== undefined) {
          fd.set("fisa_tourism_license", nextCheckin.fisa_tourism_license ?? "");
        }
        if (nextCheckin.fisa_property_address !== undefined) {
          fd.set("fisa_property_address", nextCheckin.fisa_property_address ?? "");
        }
        if (fiscalChanged) {
          fd.set("fiscal_provider", draft.fiscalProvider);
          fd.set("anaf_enabled", draft.anafEnabled ? "true" : "false");
          fd.set("anaf_env", draft.anafEnv);
          fd.set("anaf_cif", draft.anafCif);
        }

        const result = await updateFiscalBillingSettingsAction(fd);
        if (!result.ok) {
          setSaveError(result.error ?? t("saveError"));
          notifyError(t("saveError"), result.error ?? "");
          return;
        }

        const updatedBooking = { ...bookingRules, ...nextBooking };
        const updatedCheckin = { ...checkinSettings, ...nextCheckin };
        const updatedFiscal = { ...tenantFiscalSettings, ...nextFiscal };
        setBookingRules(updatedBooking);
        setCheckinSettings(updatedCheckin);
        setTenantFiscalSettings(updatedFiscal);
        setDraft(
          buildDraft(updatedBooking, updatedCheckin, country, updatedFiscal)
        );
        setEditing(false);
        notifySuccess(t("saved"));
      } catch (e) {
        const message = e instanceof Error ? e.message : t("saveError");
        setSaveError(message);
        notifyError(t("saveError"), message);
      } finally {
        setIsSaving(false);
      }
    })();
  }

  function labelFor(key: "taxId" | "regCom" | "tourismLicense") {
    const map = {
      taxId: profile.taxIdLabel,
      regCom: profile.regComLabel,
      tourismLicense: profile.tourismLicenseLabel,
    };
    return map[key][locale] ?? map[key].ro;
  }

  return (
    <div className="fiscal-settings">
      <div className="fiscal-settings__head">
        <div>
          <h3 className="checkin-settings__title">{t("title")}</h3>
          <p className="checkin-settings__note">{t("subtitle")}</p>
        </div>
        {!readOnly && !editing ? (
          <button
            type="button"
            className="checkin-stepper__btn checkin-stepper__btn--secondary"
            onClick={startEdit}
          >
            {t("edit")}
          </button>
        ) : !readOnly && editing ? (
          <div className="fiscal-settings__edit-actions">
            <button
              type="button"
              className="checkin-stepper__btn checkin-stepper__btn--primary"
              disabled={isSaving}
              onClick={saveDraft}
            >
              {isSaving ? t("save") + "…" : t("save")}
            </button>
            <button
              type="button"
              className="checkin-stepper__btn checkin-stepper__btn--secondary"
              onClick={cancelEdit}
            >
              {t("cancel")}
            </button>
          </div>
        ) : null}
      </div>

      {saveError ? (
        <p className="checkin-fisa-save__error" role="alert">
          {saveError}
        </p>
      ) : null}

      <div className="fiscal-settings__profile">
        <div className="fiscal-settings__country-badge">
          {profile.countryName[locale] ?? profile.countryName.ro}
        </div>
        <p className="fiscal-settings__authority">{profile.authorityName[locale]}</p>
        <ul className="fiscal-settings__refs">
          {(profile.officialRefs[locale] ?? profile.officialRefs.ro).map((ref) => (
            <li key={ref}>{ref}</li>
          ))}
        </ul>
        <p className="fiscal-settings__vat-note">
          {profile.vatNote[locale] ?? profile.vatNote.ro}
        </p>
      </div>

      {!sellerComplete ? (
        <p className="fiscal-settings__warning" role="status">
          {t("incompleteWarning")}
        </p>
      ) : (
        <p className="fiscal-settings__ok" role="status">
          {t("completeOk")}
        </p>
      )}

      {!editing ? (
        <dl className="fiscal-settings__summary">
          <div className="fiscal-settings__summary-row">
            <dt>{t("propertyName")}</dt>
            <dd>{propertyName}</dd>
          </div>
          <div className="fiscal-settings__summary-row">
            <dt>{labelFor("taxId")}</dt>
            <dd>{checkinSettings.fisa_owner_cui || "—"}</dd>
          </div>
          <div className="fiscal-settings__summary-row">
            <dt>{labelFor("regCom")}</dt>
            <dd>{bookingRules.invoiceSellerRegCom || "—"}</dd>
          </div>
          <div className="fiscal-settings__summary-row">
            <dt>{labelFor("tourismLicense")}</dt>
            <dd>{checkinSettings.fisa_tourism_license || "—"}</dd>
          </div>
          <div className="fiscal-settings__summary-row fiscal-settings__summary-row--wide">
            <dt>{tCheckin("fisaAddress")}</dt>
            <dd>{checkinSettings.fisa_property_address || "—"}</dd>
          </div>
          <div className="fiscal-settings__summary-row">
            <dt>{t("invoiceSeries")}</dt>
            <dd>{bookingRules.invoiceSeries}</dd>
          </div>
          <div className="fiscal-settings__summary-row">
            <dt>{t("vatRate")}</dt>
            <dd>
              {bookingRules.invoiceVatEnabled
                ? `${effectiveVatRate}% · ${profile.currency}`
                : t("vatDisabled")}
            </dd>
          </div>
          <div className="fiscal-settings__summary-row">
            <dt>{t("pricesIncludeVat")}</dt>
            <dd>
              {bookingRules.invoicePricesIncludeVat ? t("yes") : t("no")}
            </dd>
          </div>
          {country === "RO" ? (
            <>
              <div className="fiscal-settings__summary-row fiscal-settings__summary-row--wide">
                <dt>{t("eFacturaTitle")}</dt>
                <dd>{t(`provider.${tenantFiscalSettings.provider}`)}</dd>
              </div>
              {tenantFiscalSettings.provider === "anaf" ? (
                <>
                  <div className="fiscal-settings__summary-row">
                    <dt>{t("anafEnabled")}</dt>
                    <dd>{tenantFiscalSettings.anafEnabled ? t("yes") : t("no")}</dd>
                  </div>
                  <div className="fiscal-settings__summary-row">
                    <dt>{t("anafEnvironment")}</dt>
                    <dd>{t(`anafEnv.${tenantFiscalSettings.anafEnv}`)}</dd>
                  </div>
                  <div className="fiscal-settings__summary-row">
                    <dt>{t("anafCif")}</dt>
                    <dd>{tenantFiscalSettings.anafCif || checkinSettings.fisa_owner_cui || "—"}</dd>
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </dl>
      ) : (
        <>
          <SettingRow label={t("propertyName")}>
            <span className="fiscal-settings__readonly">{propertyName}</span>
          </SettingRow>

          <SettingRow label={labelFor("taxId")}>
            <input
              className="checkin-field__input"
              value={draft.taxId}
              onChange={(e) => setDraft({ ...draft, taxId: e.target.value })}
            />
          </SettingRow>

          <SettingRow label={labelFor("regCom")}>
            <input
              className="checkin-field__input"
              value={draft.regCom}
              onChange={(e) => setDraft({ ...draft, regCom: e.target.value })}
            />
          </SettingRow>

          <SettingRow label={labelFor("tourismLicense")}>
            <input
              className="checkin-field__input"
              value={draft.tourismLicense}
              onChange={(e) =>
                setDraft({ ...draft, tourismLicense: e.target.value })
              }
            />
          </SettingRow>

          <div className="checkin-setting-row checkin-setting-row--stack">
            <div className="checkin-setting-row__left">
              <span className="checkin-setting-row__label">
                {tCheckin("fisaAddress")}
              </span>
            </div>
            <div className="checkin-setting-row__right checkin-setting-row__right--wide">
              <div className="checkin-fisa-address">
                <label className="checkin-fisa-address__field">
                  <span className="checkin-fisa-address__label">
                    {tCheckin("fisaStreet")}
                  </span>
                  <input
                    type="text"
                    className="checkin-field__input checkin-field__input--wide"
                    value={draft.addressParts.street}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        addressParts: {
                          ...draft.addressParts,
                          street: e.target.value,
                        },
                      })
                    }
                  />
                </label>
                <div className="checkin-fisa-address__row">
                  <label className="checkin-fisa-address__field">
                    <span className="checkin-fisa-address__label">
                      {tCheckin("fisaLocality")}
                    </span>
                    <input
                      type="text"
                      className="checkin-field__input"
                      value={draft.addressParts.locality}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          addressParts: {
                            ...draft.addressParts,
                            locality: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <label className="checkin-fisa-address__field">
                    <span className="checkin-fisa-address__label">
                      {tCheckin("fisaCounty")}
                    </span>
                    <input
                      type="text"
                      className="checkin-field__input"
                      value={draft.addressParts.county}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          addressParts: {
                            ...draft.addressParts,
                            county: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <SettingRow label={t("invoiceSeries")} description={t("invoiceSeriesDesc")}>
            <input
              className="checkin-field__input checkin-field__input--narrow"
              value={draft.invoiceSeries}
              maxLength={12}
              onChange={(e) =>
                setDraft({ ...draft, invoiceSeries: e.target.value.toUpperCase() })
              }
            />
          </SettingRow>

          <SettingRow label={t("vatEnabled")}>
            <label className="checkin-toggle">
              <input
                type="checkbox"
                checked={draft.vatEnabled}
                onChange={(e) =>
                  setDraft({ ...draft, vatEnabled: e.target.checked })
                }
              />
              <span className="checkin-toggle__slider" />
            </label>
          </SettingRow>

          {draft.vatEnabled ? (
            <>
              <SettingRow
                label={t("vatRate")}
                description={t("vatRateDesc", {
                  default: profile.defaultAccommodationVatRate,
                  currency: profile.currency,
                })}
              >
                <div className="settings-percent-field">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    className="checkin-field__input checkin-field__input--narrow"
                    value={draft.vatRate}
                    onChange={(e) =>
                      setDraft({ ...draft, vatRate: e.target.value })
                    }
                  />
                  <span>%</span>
                </div>
              </SettingRow>
              <SettingRow label={t("pricesIncludeVat")} description={t("pricesIncludeVatDesc")}>
                <label className="checkin-toggle">
                  <input
                    type="checkbox"
                    checked={draft.pricesIncludeVat}
                    onChange={(e) =>
                      setDraft({ ...draft, pricesIncludeVat: e.target.checked })
                    }
                  />
                  <span className="checkin-toggle__slider" />
                </label>
              </SettingRow>
            </>
          ) : null}
        </>
      )}

      {country === "RO" && editing ? (
        <section className="fiscal-settings__efactura">
          <h4 className="fiscal-settings__efactura-title">{t("eFacturaTitle")}</h4>
          <p className="checkin-settings__note">{t("eFacturaDesc")}</p>
          <SettingRow label={t("fiscalProvider")} description={t("fiscalProviderDesc")}>
            <select
              className="checkin-field__input"
              value={draft.fiscalProvider}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  fiscalProvider:
                    e.target.value === "anaf" ? "anaf" : "internal_pdf",
                })
              }
            >
              <option value="internal_pdf">{t("provider.internal_pdf")}</option>
              <option value="anaf">{t("provider.anaf")}</option>
            </select>
          </SettingRow>
          {draft.fiscalProvider === "anaf" ? (
            <>
              <SettingRow label={t("anafEnabled")} description={t("anafEnabledDesc")}>
                <label className="checkin-toggle">
                  <input
                    type="checkbox"
                    checked={draft.anafEnabled}
                    onChange={(e) =>
                      setDraft({ ...draft, anafEnabled: e.target.checked })
                    }
                  />
                  <span className="checkin-toggle__slider" />
                </label>
              </SettingRow>
              <SettingRow label={t("anafEnvironment")} description={t("anafEnvDesc")}>
                <select
                  className="checkin-field__input checkin-field__input--narrow"
                  value={draft.anafEnv}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      anafEnv: e.target.value === "prod" ? "prod" : "test",
                    })
                  }
                >
                  <option value="test">{t("anafEnv.test")}</option>
                  <option value="prod">{t("anafEnv.prod")}</option>
                </select>
              </SettingRow>
              <SettingRow label={t("anafCif")} description={t("anafCifDesc")}>
                <input
                  className="checkin-field__input"
                  value={draft.anafCif}
                  placeholder={checkinSettings.fisa_owner_cui ?? ""}
                  onChange={(e) => setDraft({ ...draft, anafCif: e.target.value })}
                />
              </SettingRow>
            </>
          ) : null}
        </section>
      ) : null}

      <p className="checkin-settings__note">{t("invoiceNextHint")}</p>
    </div>
  );
}
