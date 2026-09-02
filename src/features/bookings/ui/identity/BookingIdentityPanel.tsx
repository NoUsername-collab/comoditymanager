"use client";

import type { InputHTMLAttributes } from "react";
import { useTranslations } from "next-intl";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import type { BookingIdentityController } from "@/features/bookings/ui/identity/useBookingIdentity";

export type BookingIdentityAppearance = "admin" | "compact" | "public";

type Props = {
  identity: BookingIdentityController;
  appearance: BookingIdentityAppearance;
  className?: string;
};

const APPEARANCE = {
  admin: {
    root: "space-y-3",
    names: "grid gap-3 sm:grid-cols-2",
    contacts: "space-y-3",
    label: "admin-field__label block uppercase tracking-[0.08em]",
    input: "mt-1",
    status: "text-xs",
    warn: "text-amber-800",
    found: "text-emerald-800",
    pending: "text-zinc-500",
    placeholders: false,
  },
  compact: {
    root: "space-y-3",
    names: "grid grid-cols-2 gap-2",
    contacts: "grid grid-cols-2 gap-2",
    label: "block text-sm",
    input: "mt-1 w-full rounded border border-zinc-300 px-2 py-1.5",
    status: "text-xs",
    warn: "text-amber-700",
    found: "text-zinc-500",
    pending: "text-zinc-500",
    placeholders: true,
  },
  public: {
    root: "space-y-3",
    names: "grid grid-cols-2 gap-3",
    contacts: "space-y-3",
    label: "site-field text-[var(--site-fg)]",
    input: "mt-1 w-full",
    status: "text-sm",
    warn: "text-amber-700",
    found: "text-[var(--site-muted)]",
    pending: "text-[var(--site-muted)]",
    placeholders: true,
  },
} as const;

function IdentityInput({
  appearance,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  appearance: BookingIdentityAppearance;
}) {
  if (appearance === "admin") {
    return <AdminInput className={className} {...props} />;
  }
  return <input className={className} {...props} />;
}

export function BookingIdentityPanel({
  identity,
  appearance,
  className,
}: Props) {
  const t = useTranslations("bookingIdentity");
  const skin = APPEARANCE[appearance];
  const showStatus = !identity.identityChecksReady || Boolean(identity.identityHint);
  const statusClass = !identity.identityChecksReady
    ? skin.pending
    : identity.identityHintTone === "warn"
      ? skin.warn
      : skin.found;

  return (
    <section
      className={[skin.root, className].filter(Boolean).join(" ")}
      aria-busy={!identity.identityChecksReady}
    >
      <div className={skin.names}>
        <label className={skin.label}>
          {t("lastName")}
          <IdentityInput
            appearance={appearance}
            name="guest_last_name"
            required
            autoComplete="family-name"
            placeholder={skin.placeholders ? t("lastNamePlaceholder") : undefined}
            className={skin.input}
            value={identity.guestLastName}
            onChange={(e) => identity.onLastNameChange(e.target.value)}
            onBlur={identity.maybeAutofillGuest}
          />
        </label>
        <label className={skin.label}>
          {t("firstName")}
          <IdentityInput
            appearance={appearance}
            name="guest_first_name"
            required
            autoComplete="given-name"
            placeholder={skin.placeholders ? t("firstNamePlaceholder") : undefined}
            className={skin.input}
            value={identity.guestFirstName}
            onChange={(e) => identity.onFirstNameChange(e.target.value)}
            onBlur={identity.maybeAutofillGuest}
          />
        </label>
      </div>
      <div className={skin.contacts}>
        <label className={skin.label}>
          {identity.emailRequired ? `${t("email")} *` : t("emailOptional")}
          <IdentityInput
            appearance={appearance}
            name="guest_email"
            type="email"
            required={identity.emailRequired}
            autoComplete="email"
            className={skin.input}
            value={identity.guestEmail}
            onChange={(e) => identity.onEmailChange(e.target.value)}
            onBlur={identity.maybeAutofillGuest}
          />
        </label>
        <label className={skin.label}>
          {t("phoneRequired")}
          <IdentityInput
            appearance={appearance}
            name="guest_phone"
            type="tel"
            required
            autoComplete="tel"
            className={skin.input}
            value={identity.guestPhone}
            onChange={(e) => identity.onPhoneChange(e.target.value)}
            onBlur={identity.maybeAutofillGuest}
          />
        </label>
      </div>
      {showStatus ? (
        <p className={[skin.status, statusClass].join(" ")} aria-live="polite">
          {!identity.identityChecksReady
            ? identity.checkingLabel
            : identity.identityHint}
        </p>
      ) : null}
    </section>
  );
}