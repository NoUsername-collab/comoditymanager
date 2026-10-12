"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import "@/features/checkin/ui/import-checkin-styles";
import {
  updateEmailSettingsAction,
  sendTestEmailAction,
} from "@/features/settings/actions";
import type { EmailDeliveryConfig } from "@/lib/email/provider";
import type { TransactionalEmailIdentity } from "@/services/email-identity";
import type { EmailSettings } from "@/services/email-settings";
import type { PlanEmailScope } from "@/core/config/plans";
import {
  settingsPartialChanged,
  useSettingsSaveFeedback,
} from "@/hooks/useSettingsSaveFeedback";
import { useSettingsDraft } from "@/hooks/useSettingsDraft";
import { SettingsDraftSaveBar } from "@/components/admin/settings/SettingsDraftSaveBar";
import { SettingRow } from "@/components/admin/settings/SettingRow";

type Props = {
  settings: EmailSettings;
  delivery: EmailDeliveryConfig;
  identity: TransactionalEmailIdentity;
  emailScope: PlanEmailScope;
};

export function EmailSettingsPanel({
  settings: initial,
  delivery,
  identity,
  emailScope,
}: Props) {
  const t = useTranslations("admin.pages.settings.email");
  const tSettings = useTranslations("admin.pages.settings");
  const { notifySuccess, notifyError } = useSettingsSaveFeedback();
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<EmailSettings>(initial);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    setSettings(initial);
    settingsRef.current = initial;
  }, [initial]);

  const persist = useCallback(
    (partial: Partial<EmailSettings>) => {
      const current = settingsRef.current;
      if (!settingsPartialChanged(current, partial)) return;

      const updated = { ...current, ...partial };
      settingsRef.current = updated;
      setSettings(updated);

      void (async () => {
        setIsSaving(true);
        try {
          const fd = new FormData();
          for (const [key, value] of Object.entries(partial)) {
            if (typeof value === "boolean") {
              fd.set(key, value ? "true" : "false");
            } else {
              fd.set(key, value == null ? "" : String(value));
            }
          }
          const result = await updateEmailSettingsAction(fd);
          if (result.ok) {
            notifySuccess(t("saved"));
          } else {
            notifyError(t("saveError"), result.error ?? "");
            setSettings(current);
            settingsRef.current = current;
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : t("saveError");
          notifyError(t("saveError"), message);
          setSettings(current);
          settingsRef.current = current;
        } finally {
          setIsSaving(false);
        }
      })();
    },
    [notifyError, notifySuccess, t]
  );

  const text = useSettingsDraft(
    {
      email_from_name: settings.email_from_name ?? "",
      email_reply_to: settings.email_reply_to ?? "",
      email_from_address: settings.email_from_address ?? "",
      email_custom_footer: settings.email_custom_footer ?? "",
    },
    async (_values, changed) => {
      const fd = new FormData();
      const partial: Partial<EmailSettings> = {};
      for (const [key, value] of Object.entries(changed)) {
        const clean = String(value ?? "").trim() || null;
        fd.set(key, clean ?? "");
        (partial as Record<string, string | null>)[key] = clean;
      }
      const result = await updateEmailSettingsAction(fd);
      if (result.ok) {
        const updated = { ...settingsRef.current, ...partial };
        settingsRef.current = updated;
        setSettings(updated);
        notifySuccess(t("saved"));
      }
      return result;
    },
  );
  const fromName = text.values.email_from_name;
  const fromAddress = text.values.email_from_address;

  async function handleSendTest() {
    setIsSendingTest(true);
    try {
      const result = await sendTestEmailAction();
      if (result.ok) {
        notifySuccess(t("testSentTo", { email: result.to }));
      } else {
        notifyError(t("testFailed"), result.error ?? "");
      }
    } catch (e) {
      notifyError(
        t("testFailed"),
        e instanceof Error ? e.message : ""
      );
    } finally {
      setIsSendingTest(false);
    }
  }

  const disabled = !settings.email_enabled;

  return (
    <div className="checkin-settings">
      <p className="checkin-settings__autosave" role="note">
        {tSettings("saveModelHint")}
      </p>
      {!delivery.configured ? (
        <p className="settings-alerts__item settings-alerts__item--warning" role="status">
          {t("providerNotConfigured")}
        </p>
      ) : null}
      {emailScope === "none" ? (
        <p className="settings-alerts__item settings-alerts__item--warning" role="status">
          {t("planSendsNone")}
        </p>
      ) : null}
      {emailScope === "confirmation" ? (
        <p className="settings-alerts__item settings-alerts__item--warning" role="status">
          {t("planSendsConfirmation")}
        </p>
      ) : null}
      {emailScope === "none" ? null : (
      <>
      <div className="checkin-settings__section">
        <div className="checkin-settings__section-header">
          <span className="checkin-settings__section-title">
            {t("masterToggleTitle")}
          </span>
          <span className="checkin-settings__section-desc">
            {t("masterToggleDesc")}
          </span>
        </div>

        <SettingRow label={t("enabled")} description={t("enabledDesc")}>
          <label className="checkin-toggle">
            <input
              type="checkbox"
              checked={settings.email_enabled}
              onChange={(e) => persist({ email_enabled: e.target.checked })}
            />
            <span className="checkin-toggle__slider" />
          </label>
        </SettingRow>
      </div>

      {emailScope === "stay" ? (
      <div className="checkin-settings__section">
        <div className="checkin-settings__section-header">
          <span className="checkin-settings__section-title">
            {t("adminNotificationsTitle")}
          </span>
          <span className="checkin-settings__section-desc">
            {t("adminNotificationsDesc")}
          </span>
        </div>

        <SettingRow
          label={t("notifyNewRequest")}
          description={t("notifyNewRequestDesc")}
        >
          <label className="checkin-toggle">
            <input
              type="checkbox"
              checked={settings.email_notify_new_request}
              disabled={disabled}
              onChange={(e) =>
                persist({ email_notify_new_request: e.target.checked })
              }
            />
            <span className="checkin-toggle__slider" />
          </label>
        </SettingRow>

        <SettingRow
          label={t("notifyDailySummary")}
          description={t("notifyDailySummaryDesc")}
        >
          <label className="checkin-toggle">
            <input
              type="checkbox"
              checked={settings.email_notify_daily_summary}
              disabled={disabled}
              onChange={(e) =>
                persist({ email_notify_daily_summary: e.target.checked })
              }
            />
            <span className="checkin-toggle__slider" />
          </label>
        </SettingRow>
      </div>
      ) : null}

      <div className="checkin-settings__section">
        <div className="checkin-settings__section-header">
          <span className="checkin-settings__section-title">
            {t("guestNotificationsTitle")}
          </span>
          <span className="checkin-settings__section-desc">
            {t("guestNotificationsDesc")}
          </span>
        </div>

        <SettingRow
          label={t("notifyConfirmation")}
          description={t("notifyConfirmationDesc")}
        >
          <label className="checkin-toggle">
            <input
              type="checkbox"
              checked={settings.email_notify_confirmation}
              disabled={disabled}
              onChange={(e) =>
                persist({ email_notify_confirmation: e.target.checked })
              }
            />
            <span className="checkin-toggle__slider" />
          </label>
        </SettingRow>

        {emailScope === "stay" ? (
        <SettingRow
          label={t("notifyCancellation")}
          description={t("notifyCancellationDesc")}
        >
          <label className="checkin-toggle">
            <input
              type="checkbox"
              checked={settings.email_notify_cancellation}
              disabled={disabled}
              onChange={(e) =>
                persist({ email_notify_cancellation: e.target.checked })
              }
            />
            <span className="checkin-toggle__slider" />
          </label>
        </SettingRow>
        ) : null}
      </div>

      <div className="checkin-settings__section">
        <div className="checkin-settings__section-header">
          <span className="checkin-settings__section-title">{t("senderTitle")}</span>
          <span className="checkin-settings__section-desc">{t("senderDesc")}</span>
        </div>

        <div className="checkin-setting-row checkin-setting-row--stack">
          <div className="checkin-setting-row__left">
            <span className="checkin-setting-row__label">{t("senderFromName")}</span>
            <span className="checkin-setting-row__desc">{t("senderFromNameDesc")}</span>
          </div>
          <div className="checkin-setting-row__right checkin-setting-row__right--wide">
            <input
              type="text"
              className="checkin-field__input"
              placeholder={identity.displayName}
              value={fromName}
              onChange={(e) => text.set("email_from_name", e.target.value)}
            />
          </div>
        </div>

        <SettingRow label={t("replyTo")} description={t("replyToDesc")}>
          <input
            type="email"
            className="checkin-field__input"
            placeholder={identity.defaultReplyTo ?? "contact@pensiune.ro"}
            value={text.values.email_reply_to}
            onChange={(e) => text.set("email_reply_to", e.target.value)}
          />
        </SettingRow>

        {!settings.email_reply_to && identity.defaultReplyTo ? (
          <p className="checkin-sheet-save__hint">{t("replyToFallbackHint")}</p>
        ) : null}
      </div>

      <div className="checkin-settings__section">
        <div className="checkin-settings__section-header">
          <span className="checkin-settings__section-title">{t("testTitle")}</span>
          <span className="checkin-settings__section-desc">{t("testDesc")}</span>
        </div>
        {delivery.configured ? (
          <p className="checkin-sheet-save__hint">
            {t("providerFrom", { from: identity.fromAddress })}
          </p>
        ) : null}

        <div className="checkin-sheet-save">
          <button
            type="button"
            className="checkin-sheet-save__btn"
            disabled={!delivery.configured || isSendingTest || isSaving}
            onClick={handleSendTest}
          >
            {isSendingTest ? t("testSending") : t("testSend")}
          </button>
        </div>
      </div>

      {/* Own sending domain and footer text: rarely needed, folded away. */}
      <details className="checkin-settings__section checkin-settings__advanced">
        <summary className="checkin-settings__section-header">
          <span className="checkin-settings__section-title">{t("advancedTitle")}</span>
          <span className="checkin-settings__section-desc">{t("advancedHint")}</span>
        </summary>

        <div className="checkin-setting-row checkin-setting-row--stack">
          <div className="checkin-setting-row__left">
            <span className="checkin-setting-row__label">{t("senderFromAddress")}</span>
            <span className="checkin-setting-row__desc">{t("senderFromAddressDesc")}</span>
          </div>
          <div className="checkin-setting-row__right checkin-setting-row__right--wide">
            <input
              type="email"
              className="checkin-field__input"
              placeholder={identity.defaultReplyTo ?? `noreply@${identity.mailDomain}`}
              value={fromAddress}
              onChange={(e) => text.set("email_from_address", e.target.value)}
            />
          </div>
        </div>

        <p className="checkin-sheet-save__hint">
          {t("senderPreview")}: <strong>{fromName.trim() || identity.displayName} &lt;{fromAddress.trim() || `noreply@${identity.mailDomain}`}&gt;</strong>
        </p>

        <div className="checkin-setting-row checkin-setting-row--stack">
          <div className="checkin-setting-row__left">
            <span className="checkin-setting-row__label">
              {t("customFooter")}
            </span>
            <span className="checkin-setting-row__desc">
              {t("customFooterDesc")}
            </span>
          </div>
          <div className="checkin-setting-row__right checkin-setting-row__right--wide">
            <textarea
              className="checkin-field__input checkin-field__input--textarea"
              rows={2}
              value={text.values.email_custom_footer}
              onChange={(e) => text.set("email_custom_footer", e.target.value)}
            />
          </div>
        </div>
      </details>
      </>
      )}

      <SettingsDraftSaveBar draft={text} errorFallback={t("saveError")} />
    </div>
  );
}
