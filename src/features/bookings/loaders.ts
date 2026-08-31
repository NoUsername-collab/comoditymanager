import { mapBookingToForCheckin } from "@/domain/checkin/map-booking";
import { ensureTenantContextFromRequest } from "@/lib/tenant/bind-request-context";
import { resolveShowBrandingForRequest } from "@/lib/tenant/resolve-fiscal-tenant";
import { loadFinancialSnapshot } from "@/services/booking-financial";
import {
  listBookingProformas,
  previewBookingProforma,
} from "@/services/booking-proforma";
import { getStayPricingRules } from "@/services/booking-rules-settings";
import { loadBookingConfirmContext } from "@/services/booking-confirm";
import { resolvePostCheckoutEditPolicy } from "@/services/bookings/post-checkout-guard";
import { getBookingById } from "@/services/bookings/queries";
import {
  DEFAULT_CHECKIN_SETTINGS,
  getCheckinByBookingId,
  getCheckinSettings,
} from "@/services/checkin";
import { attachCheckinRecordState } from "@/services/checkin/attach-booking-state";
import { getFiscalStatusMapForInvoices } from "@/services/fiscal-submission";
import { getGuestFeedbackByBookingId } from "@/services/guest-feedback";
import { dedupInputFromBooking, findDedupCandidates } from "@/services/guest-dedup";
import {
  listBookingInvoices,
  previewBookingInvoice,
} from "@/services/issued-invoice";
import { getTenantFiscalSettings } from "@/services/tenant-fiscal-settings";

const EMPTY_POST_CHECKOUT_POLICY = {
  memberRole: null,
  allowPostCheckoutEdits: false,
  canEditAfterCheckout: false,
} as const;

export async function loadBookingDetailPage(bookingId: string) {
  const ctxPromise = loadBookingConfirmContext(bookingId).catch(() => null);
  const checkinSettingsPromise = getCheckinSettings().catch(() => null);
  const postCheckoutPolicyPromise = resolvePostCheckoutEditPolicy().catch(
    () => EMPTY_POST_CHECKOUT_POLICY,
  );
  const bookingExtrasPromise = ctxPromise.then((ctx) => {
    if (!ctx) {
      return {
        dedupCandidates: [] as Awaited<ReturnType<typeof findDedupCandidates>>,
        existingCheckin: null as Awaited<
          ReturnType<typeof getCheckinByBookingId>
        >,
        guestFeedback: null as Awaited<
          ReturnType<typeof getGuestFeedbackByBookingId>
        >,
        financialSnapshot: null as Awaited<
          ReturnType<typeof loadFinancialSnapshot>
        >,
      };
    }
    const { booking } = ctx;
    return Promise.all([
      findDedupCandidates(
        dedupInputFromBooking({
          guestLastName: booking.guest_last_name ?? "",
          guestFirstName: booking.guest_first_name ?? "",
          guestEmail: booking.guest_email,
          guestPhone: booking.guest_phone ?? "",
          excludeGuestId: booking.guest_id ?? undefined,
        }),
      ).catch(() => []),
      getCheckinByBookingId(booking.id).catch(() => null),
      getGuestFeedbackByBookingId(booking.id).catch(() => null),
      booking.status === "confirmata"
        ? loadFinancialSnapshot(booking.id).catch(() => null)
        : Promise.resolve(null),
    ]).then(
      ([dedupCandidates, existingCheckin, guestFeedback, financialSnapshot]) => ({
        dedupCandidates,
        existingCheckin,
        guestFeedback,
        financialSnapshot,
      }),
    );
  });

  const [ctx, bookingExtras, checkinSettings, postCheckoutPolicy, pricingRules] =
    await Promise.all([
      ctxPromise,
      bookingExtrasPromise,
      checkinSettingsPromise,
      postCheckoutPolicyPromise,
      getStayPricingRules().catch(() => null),
    ]);

  if (!ctx) return null;

  const { booking } = ctx;
  const { dedupCandidates, existingCheckin, guestFeedback, financialSnapshot } =
    bookingExtras;
  const effectiveCheckinSettings = checkinSettings ?? DEFAULT_CHECKIN_SETTINGS;

  const [bookingWithCheckin] = await attachCheckinRecordState([booking], {
    repairOrphans: true,
  });
  const operativeBooking = bookingWithCheckin ?? booking;
  const checkedInRooms = operativeBooking.checked_in_rooms ?? [];
  const keysHandedRooms = operativeBooking.keys_handed_rooms ?? [];
  const hasCheckinRecord =
    !!operativeBooking.has_checkin_record || !!existingCheckin;

  return {
    ctx,
    booking,
    dedupCandidates,
    existingCheckin,
    guestFeedback,
    financialSnapshot,
    checkinSettings: effectiveCheckinSettings,
    postCheckoutPolicy,
    pricingRules,
    operativeBooking,
    checkedInRooms,
    keysHandedRooms,
    hasCheckinRecord,
    bookingForCheckin: mapBookingToForCheckin({
      ...booking,
      checked_in_rooms: checkedInRooms,
    }),
  };
}

export async function loadBookingInvoicePage(bookingId: string) {
  await ensureTenantContextFromRequest();
  const booking = await getBookingById(bookingId);
  if (!booking || booking.status !== "confirmata") return null;

  const [invoices, proformas, financial, preview, proformaPreview, fiscalSettings] =
    await Promise.all([
      listBookingInvoices(bookingId),
      listBookingProformas(bookingId),
      loadFinancialSnapshot(bookingId),
      previewBookingInvoice(bookingId),
      previewBookingProforma(bookingId),
      getTenantFiscalSettings(),
    ]);

  if (!preview || !financial) return null;

  const fiscalStatusByInvoiceId = await getFiscalStatusMapForInvoices(
    invoices.map((inv) => inv.id),
  );
  const showPlatformBranding = await resolveShowBrandingForRequest();

  return {
    booking,
    invoices,
    proformas,
    financial,
    preview,
    proformaPreview,
    fiscalSettings,
    fiscalStatusByInvoiceId,
    showPlatformBranding,
  };
}
