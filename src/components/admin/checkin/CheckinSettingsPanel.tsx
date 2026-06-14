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
  value,
  onCommit,
}: {
  value: string | null;
  onCommit: (address: string | null) => void;
}) {
  const t = useTranslations("admin.pages.settings.checkin");
  const initial = useMemo(() => parseFisaPropertyAddress(value), [value]);
  const [parts, setParts] = useState<FisaPropertyAddressParts>(initial);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setParts(parseFisaPropertyAddress(value));
  }, [value]);

  useEffect(
    () => () => {
      if (debounceRef.current != null) {
        window.clearTimeout(debounceRef.current);
      }
    },
    []
  );

  function scheduleCommit(next: FisaPropertyAddressParts) {
    if (debounceRef.current != null) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      onCommit(formatFisaPropertyAddress(next));
    }, 450);
  }

  function updatePart(key: keyof FisaPropertyAddressParts, raw: string) {
    const next = { ...parts, [key]: raw };
    setParts(next);
    scheduleCommit(next);
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

export function CheckinSettingsPanel({ settings: initial }: Props) {
  const t = useTranslations("admin.pages.settings.checkin");
  const router = useRouter();
  const { notifySuccess, notifyError } = useSettingsSaveFeedback();
  const [pending, startTransition] = useTransition();
  const [settings, setSettings] = useState<CheckinSettings>(initial);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    setSettings(initial);
    settingsRef.current = initial;
  }, [initial]);

  const persist = useCallback(
    (partial: Partial<CheckinSettings>) => {
      const current = settingsRef.current;
      if (!settingsPartialChanged(current, partial)) return;

      const updated = { ...current, ...partial };
      settingsRef.current = updated;
      setSettings(updated);

      startTransition(async () => {
        const fd = new FormData();
        for (const [key, value] of Object.entries(partial)) {
          appendFormValue(fd, key, value);
        }
        const result = await updateCheckinSettingsAction(fd);
        if (result.ok) {
          notifySuccess(t("saved"));
          router.refresh();
          return;
        }
        notifyError(t("saveError"), result.error ?? "");
        setSettings(current);
        settingsRef.current = current;
      });
    },
    [notifyError, notifySuccess, router, t]
  );

  function commitTextField(
    key: "fisa_owner_cui" | "fisa_tourism_license",
    raw: string
  ) {
    persist({ [key]: raw.trim() || null });
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
            value={settings.fisa_property_address}
            onCommit={(address) => persist({ fisa_property_address: address })}
          />
        </div>
      </div>

      <SettingRow label={t("fisaCui")}>
        <input
          type="text"
          className="checkin-field__input"
          value={settings.fisa_owner_cui ?? ""}
          onChange={(e) => {
            const next = e.target.value;
            const updated = {
              ...settingsRef.current,
              fisa_owner_cui: next || null,
            };
            settingsRef.current = updated;
            setSettings(updated);
          }}
          onBlur={(e) => commitTextField("fisa_owner_cui", e.target.value)}
        />
      </SettingRow>

      <SettingRow label={t("fisaLicense")} description={t("fisaLicenseDesc")}>
        <input
          type="text"
          className="checkin-field__input"
          value={settings.fisa_tourism_license ?? ""}
          onChange={(e) => {
            const next = e.target.value;
            const updated = {
              ...settingsRef.current,
              fisa_tourism_license: next || null,
            };
            settingsRef.current = updated;
            setSettings(updated);
          }}
          onBlur={(e) => commitTextField("fisa_tourism_license", e.target.value)}
        />
      </SettingRow>
    </div>
  );
}
