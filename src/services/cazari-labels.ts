import type { CazariLabels } from "@/components/admin/cazari/types";

type CazariLabelSources = {
  tPages: (key: string, values?: Record<string, string | number>) => string;
  tCommon: (key: string, values?: Record<string, string | number>) => string;
  tFlow: (key: string) => string;
};

/** Presentation layer — maps i18n keys to CazariLabels contract. */
export function buildCazariLabels({
  tPages,
  tCommon,
  tFlow,
}: CazariLabelSources): CazariLabels {
  return {
    noContact: tCommon("noContact"),
    noRoom: tPages("noRoomBadge"),
    statusConfirmed: tFlow("confirmata"),
    statusRequest: tFlow("cerere_noua"),
    statusCancelled: tFlow("anulata"),
    details: tCommon("details"),
    refusedHint: tPages("refusedHint"),
    refusedEmpty: tPages("refusedEmpty"),
    refusedEmptyDesc: tPages("refusedEmptyDesc"),
    refusedEmptyFilter: tPages("refusedEmptyFilter"),
    refusedEmptyFilterDesc: tPages("refusedEmptyFilterDesc"),
    historyCancelledSection: (count) =>
      tPages("historyCancelledSection", { count }),
    historyCancelledHint: tPages("historyCancelledHint"),
    historyCancelledBadge: tPages("historyCancelledBadge"),
    historyCancelledAt: (date) => tPages("historyCancelledAt", { date }),
    tabOperational: tPages("tabOperational"),
    tabRefused: tPages("tabRefused"),
    refusedBrowseBookings: tPages("refusedBrowseBookings"),
    historyCompletedSection: tPages("historyCompletedSection"),
    historyConfirmedRecentSection: (count) =>
      tPages("historyConfirmedRecentSection", { count }),
    historyConfirmedRecentHint: tPages("historyConfirmedRecentHint"),
    historyConfirmedRecentBadge: (date) =>
      tPages("historyConfirmedRecentBadge", { date }),
    cancelStay: tPages("cancelStay"),
    cancelRequest: tPages("cancelRequest"),
    guestsShort: (adults, children) =>
      tCommon("guestsShort", { adults, children }),
    cancelConfirmedMsg: (ref, name, period) =>
      tPages("cancelConfirmedMsg", { ref, name, period }),
    cancelRequestMsg: (ref, name, period) =>
      tPages("cancelRequestMsg", { ref, name, period }),
    emptyConfirmed: {
      title: tPages("emptyConfirmedFilter"),
      description: tPages("emptyConfirmedFilterDesc"),
      href: "/admin/calendar",
      label: tPages("openCalendar"),
    },
    emptyRequest: {
      title: tPages("emptyRequestWaiting"),
      description: tPages("emptyRequestWaitingDesc"),
      href: "/admin/bookings",
      label: tPages("seeNewRequests"),
    },
    historyFiltered: (count) => tPages("historyFiltered", { count }),
    historyRecent: (count) => tPages("historyRecent", { count }),
    historyFilteredHint: tPages("historyFilteredHint"),
    historyRecentHint: tPages("historyRecentHint"),
    tryOtherCriteria: tPages("tryOtherCriteria"),
    historyWillAppear: tPages("historyWillAppear"),
    historyEmptyFilter: tPages("historyEmptyFilter"),
    historyEmpty: tPages("historyEmpty"),
    checkout: tCommon("checkout"),
    openBooking: tCommon("openBooking"),
    acceptAgain: tPages("acceptAgain"),
    acceptAgainHint: tPages("acceptAgainHint"),
    undoCancelConfirm: tPages("undoCancelConfirm"),
    openClientProfile: tPages("openClientProfile"),
    checkIn: tCommon("checkIn"),
    edit: tCommon("edit"),
    movePrevDay: tPages("movePrevDay"),
    moveNextDay: tPages("moveNextDay"),
    checkoutNeedsCheckin: tPages("checkoutNeedsCheckin"),
    checkoutAlreadyDone: tPages("checkoutAlreadyDone"),
    checkActionsOnlyConfirmed: tPages("checkActionsOnlyConfirmed"),
    moveOnlyConfirmed: tPages("moveOnlyConfirmed"),
    phoneRequiredForCheckIn: tPages("phoneRequiredForCheckIn"),
    behaviorShort: tPages("behaviorShort"),
    loyaltyShort: tPages("loyaltyShort"),
    starsShort: tPages("starsShort"),
    groupedToday: (count) => tPages("groupedToday", { count }),
    groupedThisWeek: (count) => tPages("groupedThisWeek", { count }),
    groupedThisMonth: (count) => tPages("groupedThisMonth", { count }),
    groupedUpcoming: (count) => tPages("groupedUpcoming", { count }),
    groupedTodayHint: tPages("groupedTodayHint"),
    groupedThisWeekHint: tPages("groupedThisWeekHint"),
    groupedThisMonthHint: tPages("groupedThisMonthHint"),
    groupedUpcomingHint: tPages("groupedUpcomingHint"),
    groupedOutsideWindow: (count) => tPages("groupedOutsideWindow", { count }),
    horizonToday: tPages("horizonToday"),
    horizonWeek: tPages("horizonWeek"),
    horizon30d: tPages("horizon30d"),
    horizon60d: tPages("horizon60d"),
    horizon180d: tPages("horizon180d"),
    horizon365d: tPages("horizon365d"),
    loadMore: tPages("loadMore"),
    visibleWindow: tPages("visibleWindow"),
  };
}
