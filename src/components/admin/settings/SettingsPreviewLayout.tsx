"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { PensionContact } from "@/domain/settings/pension-identity";
import { buildPublicContactLinks } from "@/features/public-site/contact/PublicContactBar";

type Props = {
  displayName: string;
  contact: PensionContact;
};

/** Mini preview — how identity appears in public header/footer. */
export function IdentitySitePreview({ displayName, contact }: Props) {
  const t = useTranslations("admin.pages.settings");
  const tHeader = useTranslations("public.header");
  const tFooter = useTranslations("public.footer");
  const links = buildPublicContactLinks(contact);

  return (
    <div className="settings-identity-preview">
      <p className="settings-identity-preview__label">{t("identityPreviewLabel")}</p>
      <div className="settings-identity-preview__frame">
        <header className="settings-identity-preview__header">
          <div className="settings-identity-preview__brand">
            <span className="settings-identity-preview__logo" aria-hidden />
            <div>
              <span className="settings-identity-preview__name">{displayName || "—"}</span>
              <span className="settings-identity-preview__tag">{tHeader("subtitle")}</span>
            </div>
          </div>
        </header>
        <div className="settings-identity-preview__email">
          <p className="settings-identity-preview__email-label">{t("identityPreviewEmail")}</p>
          <p className="settings-identity-preview__email-from">
            <strong>{displayName || "—"}</strong>
            <span>{`<${contact.email?.trim() || t("identityPreviewEmailFallback")}>`}</span>
          </p>
        </div>
        <footer className="settings-identity-preview__footer">
          <p className="settings-identity-preview__footer-brand">{displayName || "—"}</p>
          <p className="settings-identity-preview__footer-label">{tFooter("contact")}</p>
          {links.length > 0 ? (
            <div className="settings-identity-preview__links">
              {links.map((link) => (
                <span key={link.id}>{link.label}</span>
              ))}
            </div>
          ) : (
            <p className="settings-identity-preview__muted">{tFooter("contactNotConfigured")}</p>
          )}
        </footer>
      </div>
    </div>
  );
}

export function SettingsPreviewLayout({
  form,
  preview,
  previewLabel,
}: {
  form: ReactNode;
  preview: ReactNode;
  previewLabel?: string;
}) {
  const t = useTranslations("admin.pages.settings");

  return (
    <div className="settings-preview-layout">
      <div className="settings-preview-layout__form">{form}</div>
      <aside
        className="settings-preview-layout__aside"
        aria-label={previewLabel ?? t("livePreviewAria")}
      >
        <p className="settings-preview-layout__aside-title">
          {previewLabel ?? t("asOnSite")}
        </p>
        {preview}
      </aside>
    </div>
  );
}
