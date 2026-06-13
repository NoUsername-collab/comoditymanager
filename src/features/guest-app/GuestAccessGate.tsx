"use client";

import { useTranslations } from "next-intl";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { formatRoDate } from "@/lib/stay-dates";
import type { GuestAccessDenyReason, GuestAccessSchedule } from "@/domain/guest-app/types";
import { GuestAppShell } from "@/features/guest-app/GuestAppShell";
import type { GuestAppAppearance } from "@/domain/guest-app/types";
import { useLocale } from "next-intl";

const ERROR_KEYS = {
  disabled: "errors.disabled",
  setup_incomplete: "errors.setupIncomplete",
  not_found: "errors.notFound",
  wrong_host: "errors.wrongHost",
  revoked: "errors.revoked",
  booking_not_confirmed: "errors.notConfirmed",
} as const;

type Props = {
  accessCode: string;
  pensionName: string;
  publicThemeId: string;
  appearance?: GuestAppAppearance;
  reason: GuestAccessDenyReason;
  message?: string;
  schedule?: GuestAccessSchedule;
};

export function GuestAccessGate({
  accessCode,
  pensionName,
  publicThemeId,
  appearance = {},
  reason,
  message,
  schedule,
}: Props) {
  const t = useTranslations("guestApp.access");
  const locale = useLocale();
  const isScheduled =
    reason === "before_check_in" || reason === "after_check_out";

  if (isScheduled && schedule) {
    const title =
      reason === "before_check_in" ? t("scheduled.beforeTitle") : t("scheduled.afterTitle");
    const body =
      reason === "before_check_in"
        ? t("scheduled.beforeBody", { date: formatRoDate(schedule.opensOn) })
        : t("scheduled.afterBody", { date: formatRoDate(schedule.closesOn) });

    return (
      <GuestAppShell
        accessCode={accessCode}
        appearance={appearance}
        publicThemeId={publicThemeId}
        pensionName={pensionName}
        showNavigation={false}
      >
        <div className="guest-app__alert-warn">
          <p className="guest-app__alert-warn__eyebrow">{t("eyebrow")}</p>
          <h1 className="guest-app__alert-warn__title">{title}</h1>
          <p className="guest-app__alert-warn__body">{body}</p>
          <p className="guest-app__alert-warn__body mt-4">
            {t("scheduled.stayPeriod")}{" "}
            {formatStayPeriod(schedule.checkIn, schedule.checkOut, locale, true)}
          </p>
          {reason === "before_check_in" ? (
            <p className="guest-app__muted mt-3 text-xs">
              {t("scheduled.beforeHint", { date: formatRoDate(schedule.opensOn) })}
            </p>
          ) : null}
        </div>
      </GuestAppShell>
    );
  }

  const text =
    message ??
    (reason in ERROR_KEYS
      ? t(ERROR_KEYS[reason as keyof typeof ERROR_KEYS])
      : t("errors.generic"));

  return (
    <GuestAppShell
      accessCode={accessCode}
      appearance={appearance}
      publicThemeId={publicThemeId}
      pensionName={pensionName}
      showNavigation={false}
    >
      <div className="guest-app__alert-error">
        <h1 className="guest-app__alert-error__title">{t("deniedTitle")}</h1>
        <p className="guest-app__alert-error__body">{text}</p>
      </div>
    </GuestAppShell>
  );
}
