"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { updateCheckinSettingsAction } from "@/app/[locale]/admin/(panel)/checkin/actions";
import type { CheckinSettings } from "@/domain/checkin/types";

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

export function CheckinSettingsPanel({ settings: initial }: Props) {
  const t = useTranslations("admin.settings.checkin");
  const { showToast } = useAdminFx();
  const [pending, startTransition] = useTransition();
  const [settings, setSettings] = useState<CheckinSettings>(initial);

  function save(partial: Partial<CheckinSettings>) {
    const updated = { ...settings, ...partial };
    setSettings(updated);

    startTransition(async () => {
      const fd = new FormData();
      for (const [key, value] of Object.entries(partial)) {
        fd.set(key, String(value ?? ""));
      }
      const result = await updateCheckinSettingsAction(fd);
      if (result.ok) {
        showToast({ kind: "success", title: t("saved") });
      } else {
        showToast({ kind: "error", title: result.error ?? "Error" });
      }
    });
  }

  return (
    <div className={`checkin-settings ${pending ? "checkin-settings--pending" : ""}`}>
      <h3 className="checkin-settings__title">{t("title")}</h3>

      {/* Document rule */}
      <SettingRow label={t("docRule")} description={t("docRuleDesc")}>
        <select
          className="checkin-field__input"
          value={settings.checkin_doc_rule}
          onChange={(e) =>
            save({
              checkin_doc_rule: e.target.value as CheckinSettings["checkin_doc_rule"],
            })
          }
        >
          <option value="required">{t("ruleRequired")}</option>
          <option value="recommended">{t("ruleRecommended")}</option>
          <option value="optional">{t("ruleOptional")}</option>
        </select>
      </SettingRow>

      {/* CNP rule */}
      <SettingRow label={t("cnpRule")} description={t("cnpRuleDesc")}>
        <select
          className="checkin-field__input"
          value={settings.checkin_cnp_rule}
          onChange={(e) =>
            save({
              checkin_cnp_rule: e.target.value as CheckinSettings["checkin_cnp_rule"],
            })
          }
        >
          <option value="required">{t("ruleRequired")}</option>
          <option value="recommended">{t("ruleRecommended")}</option>
          <option value="optional">{t("ruleOptional")}</option>
        </select>
      </SettingRow>

      {/* Phone rule */}
      <SettingRow label={t("phoneRule")} description={t("phoneRuleDesc")}>
        <select
          className="checkin-field__input"
          value={settings.checkin_phone_rule}
          onChange={(e) =>
            save({
              checkin_phone_rule: e.target.value as CheckinSettings["checkin_phone_rule"],
            })
          }
        >
          <option value="required">{t("ruleRequired")}</option>
          <option value="recommended">{t("ruleRecommended")}</option>
          <option value="optional">{t("ruleOptional")}</option>
        </select>
      </SettingRow>

      {/* Payment rule */}
      <SettingRow label={t("paymentRule")} description={t("paymentRuleDesc")}>
        <select
          className="checkin-field__input"
          value={settings.checkin_payment_rule}
          onChange={(e) =>
            save({
              checkin_payment_rule: e.target.value as CheckinSettings["checkin_payment_rule"],
            })
          }
        >
          <option value="full">{t("paymentFull")}</option>
          <option value="partial">{t("paymentPartial")}</option>
          <option value="at_checkout">{t("paymentAtCheckout")}</option>
        </select>
      </SettingRow>

      {/* Min payment percentage (visible only when partial) */}
      {settings.checkin_payment_rule === "partial" && (
        <SettingRow label={t("minPaymentPct")}>
          <input
            type="number"
            className="checkin-field__input"
            min={1}
            max={100}
            value={settings.checkin_min_payment_pct}
            onChange={(e) =>
              save({ checkin_min_payment_pct: Number(e.target.value) })
            }
          />
        </SettingRow>
      )}

      {/* Walk-in allowed */}
      <SettingRow label={t("walkinAllowed")} description={t("walkinAllowedDesc")}>
        <label className="checkin-toggle">
          <input
            type="checkbox"
            checked={settings.walkin_allowed}
            onChange={(e) => save({ walkin_allowed: e.target.checked })}
          />
          <span className="checkin-toggle__slider" />
        </label>
      </SettingRow>

      {/* Group mode */}
      <SettingRow label={t("groupMode")} description={t("groupModeDesc")}>
        <select
          className="checkin-field__input"
          value={settings.group_checkin_mode}
          onChange={(e) =>
            save({
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

      {/* Check-in time */}
      <SettingRow label={t("checkinTime")} description={t("checkinTimeDesc")}>
        <input
          type="time"
          className="checkin-field__input"
          value={settings.checkin_time_from ?? ""}
          onChange={(e) =>
            save({ checkin_time_from: e.target.value || null })
          }
        />
      </SettingRow>

      {/* Check-out time */}
      <SettingRow label={t("checkoutTime")} description={t("checkoutTimeDesc")}>
        <input
          type="time"
          className="checkin-field__input"
          value={settings.checkout_time_until ?? ""}
          onChange={(e) =>
            save({ checkout_time_until: e.target.value || null })
          }
        />
      </SettingRow>

      {/* Deposit */}
      <SettingRow label={t("deposit")} description={t("depositDesc")}>
        <label className="checkin-toggle">
          <input
            type="checkbox"
            checked={settings.checkin_deposit}
            onChange={(e) => save({ checkin_deposit: e.target.checked })}
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
              save({ checkin_deposit_amount: Number(e.target.value) })
            }
          />
        </SettingRow>
      )}

      <h4 className="checkin-settings__subtitle">{t("fisaTitle")}</h4>
      <p className="checkin-settings__fisa-note">{t("fisaNote")}</p>

      <SettingRow label={t("fisaAddress")} description={t("fisaAddressDesc")}>
        <input
          type="text"
          className="checkin-field__input checkin-field__input--wide"
          value={settings.fisa_property_address ?? ""}
          onChange={(e) =>
            save({ fisa_property_address: e.target.value || null })
          }
          placeholder="Str., nr., localitate, județ"
        />
      </SettingRow>

      <SettingRow label={t("fisaCui")}>
        <input
          type="text"
          className="checkin-field__input"
          value={settings.fisa_owner_cui ?? ""}
          onChange={(e) => save({ fisa_owner_cui: e.target.value || null })}
        />
      </SettingRow>

      <SettingRow label={t("fisaLicense")} description={t("fisaLicenseDesc")}>
        <input
          type="text"
          className="checkin-field__input"
          value={settings.fisa_tourism_license ?? ""}
          onChange={(e) =>
            save({ fisa_tourism_license: e.target.value || null })
          }
        />
      </SettingRow>
    </div>
  );
}
