"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { updatePensionIdentityAction } from "@/features/settings/actions";
import type { PensionIdentity } from "@/domain/settings/pension-identity";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { SettingsSaveBar } from "@/components/admin/settings/SettingsSaveBar";
import { SettingsFieldHint } from "@/components/admin/settings/SettingsFieldHint";
import {
  IdentitySitePreview,
  SettingsPreviewLayout,
} from "@/components/admin/settings/SettingsPreviewLayout";
import { useSettingsUnsavedWarning } from "@/hooks/useSettingsUnsavedWarning";

type Props = {
  identity: PensionIdentity;
};

export function PensionIdentityForm({ identity }: Props) {
  const t = useTranslations("admin.pages.settings.identity");
  const tSettings = useTranslations("admin.pages.settings");
  const [displayName, setDisplayName] = useState(identity.displayName);
  const [contact, setContact] = useState(identity.contact);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const initialSnapshot = useRef(
    JSON.stringify({ displayName: identity.displayName, contact: identity.contact }),
  );
  const dirty =
    JSON.stringify({ displayName, contact }) !== initialSnapshot.current;
  useSettingsUnsavedWarning(dirty && !pending);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    const result = await updatePensionIdentityAction({
      displayName,
      contact,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    initialSnapshot.current = JSON.stringify({ displayName, contact });
  }

  return (
    <SettingsPreviewLayout
      preview={<IdentitySitePreview displayName={displayName} contact={contact} />}
      form={
        <form className="settings-form-stack" onSubmit={handleSubmit}>
          {dirty && !pending && !saved ? (
            <p className="settings-unsaved-banner" role="status">
              {tSettings("unsavedChanges")}
            </p>
          ) : null}
          {saved || error ? (
            <div className="settings-alerts">
              {saved ? (
                <p className="settings-alerts__item settings-alerts__item--success" role="status">
                  {t("saved")}
                </p>
              ) : null}
              {error ? (
                <p className="settings-alerts__item settings-alerts__item--error" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}

          <section className="admin-surface-card identity-settings-card">
            <header className="identity-settings-card__head">
              <h3 className="identity-settings-card__title">{t("cardBrandTitle")}</h3>
              <p className="identity-settings-card__desc">{t("cardBrandDesc")}</p>
            </header>
            <div className="admin-settings-fields">
              <label className="admin-settings-fields__full">
                <span>{t("displayName")}</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  aria-describedby="identity-display-name-hint"
                />
                <SettingsFieldHint id="identity-display-name-hint">
                  {t("displayNameHint")}
                </SettingsFieldHint>
              </label>
            </div>
          </section>

          <section className="admin-surface-card identity-settings-card">
            <header className="identity-settings-card__head">
              <h3 className="identity-settings-card__title">{t("cardContactTitle")}</h3>
              <p className="identity-settings-card__desc">{t("cardContactDesc")}</p>
            </header>
            <div className="admin-settings-fields admin-settings-fields--2col">
              <label>
                <span>{t("email")}</span>
                <input
                  type="email"
                  value={contact.email ?? ""}
                  onChange={(e) =>
                    setContact((current) => ({
                      ...current,
                      email: e.target.value.trim() || null,
                    }))
                  }
                  aria-describedby="identity-email-hint"
                />
                <SettingsFieldHint id="identity-email-hint">{t("emailHint")}</SettingsFieldHint>
              </label>
              <label>
                <span>{t("phone")}</span>
                <input
                  value={contact.phone ?? ""}
                  onChange={(e) =>
                    setContact((current) => ({
                      ...current,
                      phone: e.target.value.trim() || null,
                    }))
                  }
                  aria-describedby="identity-phone-hint"
                />
                <SettingsFieldHint id="identity-phone-hint">{t("phoneHint")}</SettingsFieldHint>
              </label>
              <label>
                <span>{t("whatsapp")}</span>
                <input
                  value={contact.whatsapp ?? ""}
                  onChange={(e) =>
                    setContact((current) => ({
                      ...current,
                      whatsapp: e.target.value.trim() || null,
                    }))
                  }
                  placeholder="+40..."
                />
              </label>
              <label>
                <span>{t("telegram")}</span>
                <input
                  value={contact.telegram ?? ""}
                  onChange={(e) =>
                    setContact((current) => ({
                      ...current,
                      telegram: e.target.value.trim() || null,
                    }))
                  }
                  placeholder="@username"
                />
              </label>
              <label>
                <span>{t("facebook")}</span>
                <input
                  value={contact.facebook ?? ""}
                  onChange={(e) =>
                    setContact((current) => ({
                      ...current,
                      facebook: e.target.value.trim() || null,
                    }))
                  }
                />
              </label>
              <label>
                <span>{t("instagram")}</span>
                <input
                  value={contact.instagram ?? ""}
                  onChange={(e) =>
                    setContact((current) => ({
                      ...current,
                      instagram: e.target.value.trim() || null,
                    }))
                  }
                />
              </label>
              <SettingsFieldHint className="admin-settings-fields__full">
                {t("channelsHint")}
              </SettingsFieldHint>
            </div>
          </section>

      <SettingsSaveBar
        status={pending ? "saving" : saved ? "success" : error ? "error" : dirty ? "idle" : "idle"}
        statusMessage={
          pending
            ? t("saving")
            : saved
              ? t("saved")
              : error
                ? error
                : dirty
                  ? tSettings("unsavedChanges")
                  : tSettings("allSaved")
        }
      >
        <AdminSubmitButton type="submit" variant="primary" size="lg" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </AdminSubmitButton>
      </SettingsSaveBar>
        </form>
      }
    />
  );
}
