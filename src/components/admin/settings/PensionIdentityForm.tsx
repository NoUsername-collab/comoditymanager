"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { updatePensionIdentityAction } from "@/app/[locale]/admin/(panel)/settings/actions";
import type { PensionIdentity } from "@/domain/settings/pension-identity";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";

type Props = {
  identity: PensionIdentity;
};

export function PensionIdentityForm({ identity }: Props) {
  const t = useTranslations("admin.pages.settings.identity");
  const [displayName, setDisplayName] = useState(identity.displayName);
  const [contact, setContact] = useState(identity.contact);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

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
  }

  return (
    <form className="settings-form-stack" onSubmit={handleSubmit}>
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

      <div className="admin-settings-fields admin-settings-fields--2col">
        <label className="admin-settings-fields__full">
          <span>{t("displayName")}</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </label>
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
          />
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
          />
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
        <p className="admin-settings-hint admin-settings-fields__full">{t("channelsHint")}</p>
      </div>

      <div className="settings-form-stack__submit">
        <AdminSubmitButton type="submit" variant="primary" size="lg" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </AdminSubmitButton>
      </div>
    </form>
  );
}
