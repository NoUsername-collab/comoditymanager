"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { updateCheckinSettingsAction } from "@/app/[locale]/admin/(panel)/checkin/actions";
import type { CheckinSettings } from "@/domain/checkin/types";
import {
  formatFisaPropertyAddress,
  parseFisaPropertyAddress,
  type FisaPropertyAddressParts,
} from "@/domain/checkin/fisa-property-address";
import {
  settingsPartialChanged,
  useSettingsSaveFeedback,
} from "@/hooks/useSettingsSaveFeedback";

type Props = {
  settings: CheckinSettings;
};

type SettingRowProps = {
  label: string;
  description?: string;
  children: React.ReactNode;
};

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="checkin-setting-row">
      <div className="checkin-setting-row__left">
        <span className="checkin-setting-row__label">{label}</span>
        {description && (
          <span className="checkin-setting-row__desc">{description}</span>
        )}
      </div>
      <div className="checkin-setting-row__right">{children}</div>
    </div>
  );
}

function appendFormValue(fd: FormData, key: string, value: unknown) {
  if (typeof value === "boolean") {
    fd.set(key, value ? "true" : "false");
    return;
  }
  if (value == null) {
    fd.set(key, "");
    return;
  }
  fd.set(key, String(value));
}

function FisaPropertyAddressFields({
  parts,
  onPartsChange,
}: {
  parts: FisaPropertyAddressParts;
  onPartsChange: (parts: FisaPropertyAddressParts) => void;
}) {
  const t = useTranslations("admin.pages.settings.checkin");

  function updatePart(key: keyof FisaPropertyAddressParts, raw: string) {
    onPartsChange({ ...parts, [key]: raw });
  }

  return (
    <div className="checkin-fisa-address">
      <label className="checkin-fisa-address__field">
        <span className="checkin-fisa-address__label">{t("fisaStreet")}</span>
        <input
          type="text"
          className="checkin-field__input checkin-field__input--wide"
          value={parts.street}
          onChange={(e) => updatePart("street", e.target.value)}
          placeholder={t("fisaStreetPlaceholder")}
          autoComplete="street-address"
        />
      </label>
      <div className="checkin-fisa-address__row">
        <label className="checkin-fisa-address__field">
          <span className="checkin-fisa-address__label">{t("fisaLocality")}</span>
          <input
            type="text"
            className="checkin-field__input"
            value={parts.locality}
            onChange={(e) => updatePart("locality", e.target.value)}
            placeholder={t("fisaLocalityPlaceholder")}
            autoComplete="address-level2"
          />
        </label>
        <label className="checkin-fisa-address__field">
          <span className="checkin-fisa-address__label">{t("fisaCounty")}</span>
          <input
            type="text"
            className="checkin-field__input"
            value={parts.county}
            onChange={(e) => updatePart("county", e.target.value)}
            placeholder={t("fisaCountyPlaceholder")}
            autoComplete="address-level1"
          />
        </label>
      </div>
    </div>
  );
}

type FisaAnafDraft = {
  addressParts: FisaPropertyAddressParts;
  cui: string;
  license: string;
};

function buildFisaAnafDraft(settings: CheckinSettings): FisaAnafDraft {
  return {
    addressParts: parseFisaPropertyAddress(settings.fisa_property_address),
    cui: settings.fisa_owner_cui ?? "",
    license: settings.fisa_tourism_license ?? "",
  };
}

function fisaAnafDraftToSettings(draft: FisaAnafDraft): Pick<
  CheckinSettings,
  "fisa_property_address" | "fisa_owner_cui" | "fisa_tourism_license"
> {
  return {
    fisa_property_address: formatFisaPropertyAddress(draft.addressParts),
    fisa_owner_cui: draft.cui.trim() || null,
    fisa_tourism_license: draft.license.trim() || null,
  };
}

export function CheckinSettingsPanel({ settings: initial }: Props) {
  const t = useTranslations("admin.pages.settings.checkin");
  const router = useRouter();
  const { notifySuccess, notifyError } = useSettingsSaveFeedback();
  const [pending, startTransition] = useTransition();
  const [fisaPending, startFisaTransition] = useTransition();
  const [settings, setSettings] = useState<CheckinSettings>(initial);
  const [fisaDraft, setFisaDraft] = useState<FisaAnafDraft>(() =>
    buildFisaAnafDraft(initial)
  );
  const [fisaSaveError, setFisaSaveError] = useState<string | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    setSettings(initial);
    settingsRef.current = initial;
    setFisaDraft(buildFisaAnafDraft(initial));
    setFisaSaveError(null);
  }, [initial]);

  const savePartial = useCallback(
    async (
      partial: Partial<CheckinSettings>
    ): Promise<{ ok: boolean; error?: string }> => {
      const current = settingsRef.current;
      if (!settingsPartialChanged(current, partial)) {
        return { ok: true };
      }

      const updated = { ...current, ...partial };
      settingsRef.current = updated;
      setSettings(updated);

      const fd = new FormData();
      for (const [key, value] of Object.entries(partial)) {
        appendFormValue(fd, key, value);
      }
      const result = await updateCheckinSettingsAction(fd);
      if (result.ok) {
        notifySuccess(t("saved"));
        router.refresh();
        return { ok: true };
      }

      notifyError(t("saveError"), result.error ?? "");
      setSettings(current);
      settingsRef.current = current;
      return { ok: false, error: result.error ?? t("saveError") };
    },
    [notifyError, notifySuccess, router, t]
  );

  const persist = useCallback(
    (partial: Partial<CheckinSettings>) => {
      startTransition(async () => {
        await savePartial(partial);
      });
    },
    [savePartial]
  );

  const fisaDirty = useMemo(() => {
    const saved = fisaAnafDraftToSettings(buildFisaAnafDraft(settings));
    const draft = fisaAnafDraftToSettings(fisaDraft);
    return (
      saved.fisa_property_address !== draft.fisa_property_address ||
      saved.fisa_owner_cui !== draft.fisa_owner_cui ||
      saved.fisa_tourism_license !== draft.fisa_tourism_license
    );
  }, [fisaDraft, settings]);

  function saveFisaAnaf() {
    setFisaSaveError(null);
    startFisaTransition(async () => {
      const result = await savePartial(fisaAnafDraftToSettings(fisaDraft));
      if (!result.ok) {
        setFisaSaveError(result.error ?? t("saveError"));
      }
    });
  }

  return (
    <div className={`checkin-settings ${pending ? "checkin-settings--pending" : ""}`}>
      <h3 className="checkin-settings__title">{t("title")}</h3>

      <SettingRow label={t("docRule")} description={t("docRuleDesc")}>
        <select
          className="checkin-field__input"
          value={settings.checkin_doc_rule}
          onChange={(e) =>
            persist({
              checkin_doc_rule: e.target.value as CheckinSettings["checkin_doc_rule"],
            })
          }
        >
          <option value="required">{t("ruleRequired")}</option>
          <option value="recommended">{t("ruleRecommended")}</option>
          <option value="optional">{t("ruleOptional")}</option>
        </select>
      </SettingRow>

      <SettingRow label={t("cnpRule")} description={t("cnpRuleDesc")}>
        <select
          className="checkin-field__input"
          value={settings.checkin_cnp_rule}
          onChange={(e) =>
            persist({
              checkin_cnp_rule: e.target.value as CheckinSettings["checkin_cnp_rule"],
            })
          }
        >
          <option value="required">{t("ruleRequired")}</option>
          <option value="recommended">{t("ruleRecommended")}</option>
          <option value="optional">{t("ruleOptional")}</option>
        </select>
      </SettingRow>

      <SettingRow label={t("phoneRule")} description={t("phoneRuleDesc")}>
        <select
          className="checkin-field__input"
          value={settings.checkin_phone_rule}
          onChange={(e) =>
            persist({
              checkin_phone_rule: e.target.value as CheckinSettings["checkin_phone_rule"],
            })
          }
        >
          <option value="required">{t("ruleRequired")}</option>
          <option value="recommended">{t("ruleRecommended")}</option>
          <option value="optional">{t("ruleOptional")}</option>
        </select>
      </SettingRow>

      <SettingRow label={t("paymentRule")} description={t("paymentRuleDesc")}>
        <select
          className="checkin-field__input"
          value={settings.checkin_payment_rule}
          onChange={(e) =>
            persist({
              checkin_payment_rule: e.target.value as CheckinSettings["checkin_payment_rule"],
            })
          }
        >
          <option value="full">{t("paymentFull")}</option>
          <option value="partial">{t("paymentPartial")}</option>
          <option value="at_checkout">{t("paymentAtCheckout")}</option>
        </select>
      </SettingRow>

      <SettingRow
        label={t("checkoutBlockUnpaid")}
        description={t("checkoutBlockUnpaidDesc")}
      >
        <label className="checkin-toggle">
          <input
            type="checkbox"
            checked={settings.checkout_block_unpaid}
            onChange={(e) => persist({ checkout_block_unpaid: e.target.checked })}
          />
          <span className="checkin-toggle__slider" />
        </label>
      </SettingRow>

      {settings.checkin_payment_rule === "partial" && (
        <SettingRow label={t("minPaymentPct")}>
          <input
            type="number"
            className="checkin-field__input"
            min={1}
            max={100}
            value={settings.checkin_min_payment_pct}
            onChange={(e) =>
              persist({ checkin_min_payment_pct: Number(e.target.value) || 0 })
            }
          />
        </SettingRow>
      )}

      <SettingRow label={t("walkinAllowed")} description={t("walkinAllowedDesc")}>
        <label className="checkin-toggle">
          <input
            type="checkbox"
            checked={settings.walkin_allowed}
            onChange={(e) => persist({ walkin_allowed: e.target.checked })}
          />
          <span className="checkin-toggle__slider" />
        </label>
      </SettingRow>

      <SettingRow label={t("groupMode")} description={t("groupModeDesc")}>
        <select
          className="checkin-field__input"
          value={settings.group_checkin_mode}
          onChange={(e) =>
            persist({
              group_checkin_mode: e.target.value as CheckinSettings["group_checkin_mode"],
            })
          }
        >
          <option value="rep">{t("groupRep")}</option>
          <option value="individual">{t("groupIndividual")}</option>
          <option value="per_room">{t("groupPerRoom")}</option>
          <option value="both">{t("groupBoth")}</option>
        </select>
      </SettingRow>

      <SettingRow label={t("checkinTime")} description={t("checkinTimeDesc")}>
        <input
          type="time"
          className="checkin-field__input"
          value={settings.checkin_time_from ?? ""}
          onChange={(e) => persist({ checkin_time_from: e.target.value || null })}
        />
      </SettingRow>

      <SettingRow label={t("checkoutTime")} description={t("checkoutTimeDesc")}>
        <input
          type="time"
          className="checkin-field__input"
          value={settings.checkout_time_until ?? ""}
          onChange={(e) =>
            persist({ checkout_time_until: e.target.value || null })
          }
        />
      </SettingRow>

      <SettingRow label={t("deposit")} description={t("depositDesc")}>
        <label className="checkin-toggle">
          <input
            type="checkbox"
            checked={settings.checkin_deposit}
            onChange={(e) => persist({ checkin_deposit: e.target.checked })}
          />
          <span className="checkin-toggle__slider" />
        </label>
      </SettingRow>

      {settings.checkin_deposit && (
        <SettingRow label={t("depositAmount")}>
          <input
            type="number"
            className="checkin-field__input"
            min={0}
            value={settings.checkin_deposit_amount}
            onChange={(e) =>
              persist({ checkin_deposit_amount: Number(e.target.value) || 0 })
            }
          />
        </SettingRow>
      )}

      <h4 className="checkin-settings__subtitle">{t("fisaTitle")}</h4>
      <p className="checkin-settings__fisa-note">{t("fisaNote")}</p>

      <div className="checkin-setting-row checkin-setting-row--stack">
        <div className="checkin-setting-row__left">
          <span className="checkin-setting-row__label">{t("fisaAddress")}</span>
          <span className="checkin-setting-row__desc">{t("fisaAddressDesc")}</span>
        </div>
        <div className="checkin-setting-row__right checkin-setting-row__right--wide">
          <FisaPropertyAddressFields
            parts={fisaDraft.addressParts}
            onPartsChange={(addressParts) =>
              setFisaDraft((current) => ({ ...current, addressParts }))
            }
          />
        </div>
      </div>

      <SettingRow label={t("fisaCui")}>
        <input
          type="text"
          className="checkin-field__input"
          value={fisaDraft.cui}
          onChange={(e) =>
            setFisaDraft((current) => ({ ...current, cui: e.target.value }))
          }
        />
      </SettingRow>

      <SettingRow label={t("fisaLicense")} description={t("fisaLicenseDesc")}>
        <input
          type="text"
          className="checkin-field__input"
          value={fisaDraft.license}
          onChange={(e) =>
            setFisaDraft((current) => ({ ...current, license: e.target.value }))
          }
        />
      </SettingRow>

      <div className="checkin-fisa-save">
        <p className="checkin-fisa-save__hint">{t("fisaSaveHint")}</p>
        {fisaSaveError ? (
          <p className="checkin-fisa-save__error" role="alert">
            {fisaSaveError}
          </p>
        ) : null}
        <button
          type="button"
          className="checkin-fisa-save__btn"
          disabled={!fisaDirty || fisaPending || pending}
          onClick={saveFisaAnaf}
        >
          {fisaPending ? t("fisaSaving") : t("fisaSave")}
        </button>
      </div>
    </div>
  );
}
