"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { quickConfirmCerereFromGanttAction } from "@/app/[locale]/admin/(panel)/calendar/actions";
import { cancelBookingAction } from "@/app/[locale]/admin/(panel)/bookings/actions";
import { BookingCancelButton } from "@/components/admin/BookingCancelButton";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import type { OperationalStay } from "@/components/admin/cazari/types";

export type StayRequestActionLabels = {
  quickAccept: string;
  quickAcceptSuccess: string;
  openBooking: string;
  cancelRequest: string;
  cancelMessage: string;
};

export function StayRequestActions({
  stay,
  returnTo,
  labels,
}: {
  stay: OperationalStay;
  returnTo: string;
  labels: StayRequestActionLabels;
}) {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const { showToast, celebrateConfirm } = useAdminFx();
  const [pending, setPending] = useState(false);

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
      celebrateConfirm(labels.quickAcceptSuccess, stay.guest_name);
      router.refresh();
    });
  }

  return (
    <div
      className="stay-card__actions flex w-full shrink-0 flex-col items-stretch gap-1 sm:min-w-[160px]"
      aria-busy={pending || undefined}
    >
      <AdminButton
        variant="primary"
        size="sm"
        fullWidth
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={quickAccept}
        className="admin-cereri-fill"
      >
        {pending ? tCommon("loading") : labels.quickAccept}
      </AdminButton>
      <Link
        href={bookingHref}
        className="admin-btn admin-btn--secondary admin-btn--sm admin-btn--full stay-card__open-booking inline-flex items-center justify-center"
      >
        {labels.openBooking}
      </Link>
      <BookingCancelButton
        label={labels.cancelRequest}
        confirmMessage={labels.cancelMessage}
        formAction={cancelBookingAction}
        bookingId={stay.id}
        returnTo={returnTo}
        variant="compact"
      />
    </div>
  );
}
