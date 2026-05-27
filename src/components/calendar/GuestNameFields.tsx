"use client";

import { useTranslations } from "next-intl";

type Props = {
  /** Formular recepție (inputuri mai mici) */
  compact?: boolean;
  lastName?: string;
  firstName?: string;
  onLastNameChange?: (value: string) => void;
  onFirstNameChange?: (value: string) => void;
  onIdentityBlur?: () => void;
};

export function GuestNameFields({
  compact,
  lastName,
  firstName,
  onLastNameChange,
  onFirstNameChange,
  onIdentityBlur,
}: Props) {
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
          value={lastName}
          onChange={(e) => onLastNameChange?.(e.target.value)}
          onBlur={onIdentityBlur}
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
          value={firstName}
          onChange={(e) => onFirstNameChange?.(e.target.value)}
          onBlur={onIdentityBlur}
        />
      </label>
    </div>
  );
}
