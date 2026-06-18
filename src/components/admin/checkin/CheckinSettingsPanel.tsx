"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { updateCheckinSettingsAction } from "@/app/[locale]/admin/(panel)/checkin/actions";
import type { CheckinSettings } from "@/domain/checkin/types";
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

export function CheckinSettingsPanel({ settings: initial }: Props) {
  const t = useTranslations("admin.pages.settings.checkin");
  const { notifySuccess, notifyError } = useSettingsSaveFeedback();
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<CheckinSettings>(initial);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    setSettings(initial);
    settingsRef.current = initial;
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

      try {
        const result = await updateCheckinSettingsAction(fd);
        if (result.ok) {
          notifySuccess(t("saved"));
          return { ok: true };
        }

        notifyError(t("saveError"), result.error ?? "");
        setSettings(current);
        settingsRef.current = current;
        return { ok: false, error: result.error ?? t("saveError") };
      } catch (e) {
        const message = e instanceof Error ? e.message : t("saveError");
        notifyError(t("saveError"), message);
        setSettings(current);
        settingsRef.current = current;
        return { ok: false, error: message };
      }
    },
    [notifyError, notifySuccess, t]
  );

  const persist = useCallback(
    (partial: Partial<CheckinSettings>) => {
      void (async () => {
        setIsSaving(true);
        try {
          await savePartial(partial);
        } finally {
          setIsSaving(false);
        }
      })();
    },
    [savePartial]
  );

  return (
    <div className="checkin-settings">
      <h3 className="checkin-settings__title">{t("title")}</h3>

      {/* ── Identitate & documente ──────────────────────────── */}
      <div className="checkin-settings__section">
        <div className="checkin-settings__section-header">
          <span className="checkin-settings__section-title">{t("sectionIdentity")}</span>
          <span className="checkin-settings__section-desc">{t("sectionIdentityDesc")}</span>
        </div>

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

        <SettingRow label={t("idsPerRoom")} description={t("idsPerRoomDesc")}>
          <select
            className="checkin-field__input"
            value={settings.checkin_ids_per_room}
            onChange={(e) =>
              persist({
                checkin_ids_per_room: e.target.value as CheckinSettings["checkin_ids_per_room"],
              })
            }
          >
            <option value="one">{t("idsPerRoomOne")}</option>
            <option value="two_non_family">{t("idsPerRoomTwoNonFamily")}</option>
          </select>
        </SettingRow>
      </div>

      {/* ── Plată ───────────────────────────────────────────── */}
      <div className="checkin-settings__section">
        <div className="checkin-settings__section-header">
          <span className="checkin-settings__section-title">{t("sectionPayment")}</span>
          <span className="checkin-settings__section-desc">{t("sectionPaymentDesc")}</span>
        </div>

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

        <SettingRow
          label={t("allowPostCheckoutEdits")}
          description={t("allowPostCheckoutEditsDesc")}
        >
          <label className="checkin-toggle">
            <input
              type="checkbox"
              checked={settings.allow_post_checkout_edits}
              onChange={(e) =>
                persist({ allow_post_checkout_edits: e.target.checked })
              }
            />
            <span className="checkin-toggle__slider" />
          </label>
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
      </div>

      {/* ── Program ─────────────────────────────────────────── */}
      <div className="checkin-settings__section">
        <div className="checkin-settings__section-header">
          <span className="checkin-settings__section-title">{t("sectionSchedule")}</span>
          <span className="checkin-settings__section-desc">{t("sectionScheduleManaged")}</span>
        </div>

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
      </div>

      {/* ── Chei & camere ───────────────────────────────────── */}
      <div className="checkin-settings__section">
        <div className="checkin-settings__section-header">
          <span className="checkin-settings__section-title">{t("sectionKeysRooms")}</span>
          <span className="checkin-settings__section-desc">{t("sectionKeysRoomsDesc")}</span>
        </div>

        <SettingRow label={t("keyRule")} description={t("keyRuleDesc")}>
          <select
            className="checkin-field__input"
            value={settings.checkin_key_rule}
            onChange={(e) =>
              persist({
                checkin_key_rule: e.target.value as CheckinSettings["checkin_key_rule"],
              })
            }
          >
            <option value="always">{t("keyRuleAlways")}</option>
            <option value="id_verified">{t("keyRuleIdVerified")}</option>
            <option value="paid">{t("keyRulePaid")}</option>
          </select>
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
      </div>
    </div>
  );
}
