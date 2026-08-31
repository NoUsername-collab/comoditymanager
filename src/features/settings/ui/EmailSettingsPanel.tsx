"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  updateEmailSettingsAction,
  sendTestEmailAction,
} from "@/features/settings/actions";
import type { EmailDeliveryConfig } from "@/lib/email/provider";
import type { TransactionalEmailIdentity } from "@/services/email-identity";
import type { EmailSettings } from "@/services/email-settings";
import {
  settingsPartialChanged,
  useSettingsSaveFeedback,
} from "@/hooks/useSettingsSaveFeedback";

type Props = {
  settings: EmailSettings;
  delivery: EmailDeliveryConfig;
  identity: TransactionalEmailIdentity;
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
        {description && (
          <span className="checkin-setting-row__desc">{description}</span>
        )}
      </div>
      <div className="checkin-setting-row__right">{children}</div>
    </div>
  );
}

export function EmailSettingsPanel({
  settings: initial,
  delivery,
  identity,
}: Props) {
  const t = useTranslations("admin.pages.settings.email");
  const { notifySuccess, notifyError } = useSettingsSaveFeedback();
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<EmailSettings>(initial);
  const [fromName, setFromName] = useState(initial.email_from_name ?? "");
  const [fromAddress, setFromAddress] = useState(initial.email_from_address ?? "");
  const [replyTo, setReplyTo] = useState(initial.email_reply_to ?? "");
  const [customFooter, setCustomFooter] = useState(
    initial.email_custom_footer ?? ""
  );
  const [isSendingTest, setIsSendingTest] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    setSettings(initial);
    settingsRef.current = initial;
    setFromName(initial.email_from_name ?? "");
    setFromAddress(initial.email_from_address ?? "");
    setReplyTo(initial.email_reply_to ?? "");
    setCustomFooter(initial.email_custom_footer ?? "");
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
      </div>

      <div className="checkin-settings__section">
        <div className="checkin-settings__section-header">
          <span className="checkin-settings__section-title">
            {t("senderTitle")}
          </span>
          <span className="checkin-settings__section-desc">
            {t("senderDesc")}
          </span>
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
              onChange={(e) => setFromName(e.target.value)}
              onBlur={() => persist({ email_from_name: fromName.trim() || null })}
            />
          </div>
        </div>

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
              onChange={(e) => setFromAddress(e.target.value)}
              onBlur={() => persist({ email_from_address: fromAddress.trim() || null })}
            />
          </div>
        </div>

        <p className="checkin-fisa-save__hint">
          {t("senderPreview")}: <strong>{fromName.trim() || identity.displayName} &lt;{fromAddress.trim() || `noreply@${identity.mailDomain}`}&gt;</strong>
        </p>
      </div>

      <div className="checkin-settings__section">
        <div className="checkin-settings__section-header">
          <span className="checkin-settings__section-title">
            {t("customizationTitle")}
          </span>
          <span className="checkin-settings__section-desc">
            {t("customizationDesc")}
          </span>
        </div>

        <SettingRow label={t("replyTo")} description={t("replyToDesc")}>
          <input
            type="email"
            className="checkin-field__input"
            placeholder={identity.defaultReplyTo ?? "contact@pensiune.ro"}
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            onBlur={() => persist({ email_reply_to: replyTo.trim() || null })}
          />
        </SettingRow>

        {!settings.email_reply_to && identity.defaultReplyTo ? (
          <p className="checkin-fisa-save__hint">{t("replyToFallbackHint")}</p>
        ) : null}

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
              value={customFooter}
              onChange={(e) => setCustomFooter(e.target.value)}
              onBlur={() =>
                persist({ email_custom_footer: customFooter.trim() || null })
              }
            />
          </div>
        </div>
      </div>

      <div className="checkin-settings__section">
        <div className="checkin-settings__section-header">
          <span className="checkin-settings__section-title">
            {t("testTitle")}
          </span>
          <span className="checkin-settings__section-desc">
            {t("testDesc")}
          </span>
        </div>

        {!delivery.configured ? (
          <p className="checkin-fisa-save__hint" role="status">
            {t("providerNotConfigured")}
          </p>
        ) : (
          <p className="checkin-fisa-save__hint">
            {t("providerFrom", { from: identity.fromAddress })}
          </p>
        )}

        <div className="checkin-fisa-save">
          <button
            type="button"
            className="checkin-fisa-save__btn"
            disabled={!delivery.configured || isSendingTest || isSaving}
            onClick={handleSendTest}
          >
            {isSendingTest ? t("testSending") : t("testSend")}
          </button>
        </div>
      </div>
    </div>
  );
}
