"use client";

import { useTranslations } from "next-intl";

type Props = {
  phone: string;
};

export function GuestReceptionFab({ phone }: Props) {
  const t = useTranslations("guestApp.shell");
  const normalized = phone.trim();
  if (!normalized) return null;

  return (
    <a
      href={`tel:${normalized}`}
      className="guest-app__reception-fab"
      aria-label={t("callReception")}
    >
      <span aria-hidden>📞</span>
      <span className="guest-app__reception-fab__label">{t("callReceptionShort")}</span>
    </a>
  );
}
