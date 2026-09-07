import type { BookingNoticePresetCopy } from "@/features/public-site/domain/booking-notice";

type CalendarTranslate = (
  key: string,
  values?: Record<string, string>
) => string;

const HOURS_PLACEHOLDERS = {
  checkIn: "{checkIn}",
  checkOut: "{checkOut}",
};

export function buildBookingNoticePresetCopy(
  t: CalendarTranslate
): BookingNoticePresetCopy {
  return {
    noPay: { title: t("asideNoPayTitle"), text: t("asideNoPayText") },
    hold: { title: t("asideHoldTitle"), text: t("asideHoldText") },
    hours: {
      title: t("asideHoursTitle"),
      text: t("asideHoursText", HOURS_PLACEHOLDERS),
    },
    confirm: { title: t("asideConfirmTitle"), text: t("asideConfirmText") },
    reply: { title: t("asideReplyTitle"), text: t("asideReplyText") },
    payOnSite: { title: t("asidePayOnSiteTitle"), text: t("asidePayOnSiteText") },
    idCheck: { title: t("asideIdCheckTitle"), text: t("asideIdCheckText") },
    breakfast: { title: t("asideBreakfastTitle"), text: t("asideBreakfastText") },
    parking: { title: t("asideParkingTitle"), text: t("asideParkingText") },
    pets: { title: t("asidePetsTitle"), text: t("asidePetsText") },
    children: { title: t("asideChildrenTitle"), text: t("asideChildrenText") },
    cancel: { title: t("asideCancelTitle"), text: t("asideCancelText") },
  };
}
