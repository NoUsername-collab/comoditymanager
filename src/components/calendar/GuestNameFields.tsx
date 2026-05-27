"use client";

import { useTranslations } from "next-intl";

type Props = {
  /** Formular recepție (inputuri mai mici) */
  compact?: boolean;
};

export function GuestNameFields({ compact }: Props) {
  const t = useTranslations("public.form");
  const inputClass = compact
    ? "mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
    : "mt-1 w-full";
  const labelClass = compact
    ? "block text-sm"
    : "site-field text-[var(--site-fg)]";

  return (
    <div className={compact ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 gap-3"}>
      <label className={labelClass}>
        {t("lastName")}
        <input
          name="guest_last_name"
          required
          autoComplete="family-name"
          placeholder={t("lastNamePlaceholder")}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        {t("firstName")}
        <input
          name="guest_first_name"
          required
          autoComplete="given-name"
          placeholder={t("firstNamePlaceholder")}
          className={inputClass}
        />
      </label>
    </div>
  );
}
