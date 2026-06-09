import { GuestBookingFormLazy } from "@/components/calendar/GuestBookingFormLazy";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { getPensionSettings } from "@/services/pension-settings";
import { getTranslations } from "next-intl/server";

export default async function CalendarPublicPage() {
  const [t, tShell, settings] = await Promise.all([
    getTranslations("public.calendar"),
    getTranslations("public.shell"),
    getPensionSettings().catch(() => null),
  ]);

  const checkInTime = settings?.default_check_in_time ?? "14:00";
  const checkOutTime = settings?.default_check_out_time ?? "11:00";
  const title = settings?.display_name ?? tShell("brandFallback");

  return (
    <PublicPageShell
      wide
      backLabel={tShell("backHome")}
      eyebrow={t("eyebrow")}
      title={title}
      lead={t("lead")}
    >
      <div className="public-booking-layout mt-5">
        <aside className="public-booking-aside">
          <p className="text-sm font-semibold text-[var(--site-fg)]">
            {t("asideTitle")}
          </p>
          <ul className="public-booking-aside__list">
            <li className="public-booking-aside__item">
              <span aria-hidden>✓</span>
              <span>
                <strong>{t("asideNoPayTitle")}</strong>
                {t("asideNoPayText")}
              </span>
            </li>
            <li className="public-booking-aside__item">
              <span aria-hidden>⏱</span>
              <span>
                <strong>{t("asideHoldTitle")}</strong>
                {t("asideHoldText")}
              </span>
            </li>
            <li className="public-booking-aside__item">
              <span aria-hidden>🕐</span>
              <span>
                <strong>{t("asideHoursTitle")}</strong>
                {t("asideHoursText", { checkIn: checkInTime, checkOut: checkOutTime })}
              </span>
            </li>
          </ul>
        </aside>

        <GuestBookingFormLazy
          checkInTime={checkInTime}
          checkOutTime={checkOutTime}
        />
      </div>
    </PublicPageShell>
  );
}
