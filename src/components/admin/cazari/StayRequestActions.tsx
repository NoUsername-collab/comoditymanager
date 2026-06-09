"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { quickConfirmCerereFromGanttAction } from "@/app/[locale]/admin/(panel)/calendar/actions";
import { cancelBookingAction } from "@/app/[locale]/admin/(panel)/bookings/actions";
import { BookingCancelButton } from "@/components/admin/BookingCancelButton";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { formatBookingRef } from "@/lib/booking-admin-links";
import { formatStayPeriod } from "@/lib/ro-calendar";
import type { CazariLabels, OperationalStay } from "@/components/admin/cazari/types";

export function StayRequestActions({
  stay,
  returnTo,
  labels,
}: {
  stay: OperationalStay;
  returnTo: string;
  labels: CazariLabels;
}) {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const { showToast } = useAdminFx();
  const [pending, setPending] = useState(false);

  const period = formatStayPeriod(stay.check_in, stay.check_out, true);
  const ref = formatBookingRef(stay.id);
  const cancelMessage = labels.cancelRequestMsg(ref, stay.guest_name, period);
  const bookingHref = `/admin/bookings/${stay.id}?return_to=${encodeURIComponent(returnTo)}`;

  function quickAccept() {
    if (pending) return;
    setPending(true);
    void quickConfirmCerereFromGanttAction(stay.id).then((res) => {
      setPending(false);
      if (!res.ok) {
        showToast({ kind: "error", title: tCommon("error"), message: res.error });
        if (res.error.includes("room") || res.error.includes("camer")) {
          router.push(bookingHref);
        }
        return;
      }
      showToast({
        kind: "success",
        title: labels.quickAcceptSuccess,
        message: stay.guest_name,
      });
      router.refresh();
    });
  }

  return (
    <div className="stay-card__actions flex shrink-0 flex-col items-stretch gap-1 sm:min-w-[160px]">
      <button
        type="button"
        disabled={pending}
        onClick={quickAccept}
        className="admin-cereri-fill inline-flex justify-center rounded-md px-2.5 py-1 text-[11px] font-semibold disabled:opacity-60"
      >
        {pending ? "..." : labels.quickAccept}
      </button>
      <Link
        href={bookingHref}
        className="inline-flex justify-center rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-50 active:translate-y-px"
      >
        {labels.openBooking}
      </Link>
      <BookingCancelButton
        label={labels.cancelRequest}
        confirmMessage={cancelMessage}
        formAction={cancelBookingAction}
        bookingId={stay.id}
        returnTo={returnTo}
        variant="compact"
      />
    </div>
  );
}
