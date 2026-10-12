"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { PensionContact } from "@/domain/settings/pension-identity";

/**
 * Contact details live in Property identity. Other pages show them here, read-only,
 * with one link to change them there — never a second set of fields to fill.
 */
export function IdentityContactSummary({
  contact,
  address,
  lead,
}: {
  contact: Pick<PensionContact, "phone" | "email" | "whatsapp">;
  /** Shown when the page also uses the property address. */
  address?: string | null;
  lead: string;
}) {
  const t = useTranslations("admin.pages.settings.identity");
  const rows = [
    { label: t("phone"), value: contact.phone },
    { label: t("email"), value: contact.email },
    { label: t("whatsapp"), value: contact.whatsapp },
    ...(address !== undefined ? [{ label: t("cardAddressTitle"), value: address }] : []),
  ].filter((row) => row.value?.trim());

  return (
    <div className="identity-contact-summary">
      <p className="identity-contact-summary__lead">{lead}</p>
      {rows.length > 0 ? (
        <dl className="identity-contact-summary__list">
          {rows.map((row) => (
            <div key={row.label} className="identity-contact-summary__row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="identity-contact-summary__empty">{t("summaryEmpty")}</p>
      )}
      <Link href="/admin/settings/identity" className="identity-contact-summary__link">
        {t("summaryChange")}
      </Link>
    </div>
  );
}
