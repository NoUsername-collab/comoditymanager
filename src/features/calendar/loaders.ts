import { resolveGanttRange } from "@/domain/gantt/view-range";
import { parseIso, todayIso } from "@/lib/stay-dates";
import { resolvePostCheckoutEditPolicy } from "@/services/bookings/post-checkout-guard";
import { loadCalendarCoreData } from "@/services/calendar-page-data";
import {
  DEFAULT_CHECKIN_SETTINGS,
  getCheckinDeparturePolicy,
} from "@/services/checkin/settings";

export type CalendarSearchParams = {
  y?: string;
  m?: string;
  view?: string;
  building?: string;
  room?: string;
  zoom?: string;
  ws?: string;
  q?: string;
  filter?: string;
  layer?: string;
  feat?: string;
  fd?: string;
  avail?: string;
  avail_y?: string;
  avail_m?: string;
  avail_day?: string;
  avail_building?: string;
  avail_view?: string;
  avail_ws?: string;
  avail_feat?: string;
};

const EMPTY_POST_CHECKOUT_POLICY = {
  memberRole: null,
  allowPostCheckoutEdits: false,
  canEditAfterCheckout: false,
} as const;

export async function loadCalendarGanttPage(
  searchParams: Promise<CalendarSearchParams>,
  locale: Promise<string>,
) {
  const today = todayIso();
  const [params, loc] = await Promise.all([searchParams, locale]);
  const ref = parseIso(today);
  const y = Number(params.y) || ref.getFullYear();
  const m = params.m !== undefined ? Number(params.m) : ref.getMonth();
  const q = params.q !== undefined ? Number(params.q) : Math.floor(m / 3);
  const previewRange = resolveGanttRange({
    y,
    m,
    zoom: params.zoom,
    ws: params.ws,
    q,
    locale: loc,
    today,
  });

  const [dataResult, postCheckoutPolicy, departurePolicyData] = await Promise.all([
    loadCalendarCoreData(previewRange.rangeStart, previewRange.rangeEnd, today)
      .then((data) => ({ ok: true as const, data }))
      .catch((error) => ({ ok: false as const, error })),
    resolvePostCheckoutEditPolicy().catch(() => EMPTY_POST_CHECKOUT_POLICY),
    getCheckinDeparturePolicy().catch(() => ({
      earlyCheckoutAllowed: DEFAULT_CHECKIN_SETTINGS.early_checkout_allowed,
      earlyCheckoutFee: DEFAULT_CHECKIN_SETTINGS.early_checkout_fee,
      checkoutTimeUntil: DEFAULT_CHECKIN_SETTINGS.checkout_time_until,
    })),
  ]);

  return { today, params, dataResult, postCheckoutPolicy, departurePolicyData };
}
