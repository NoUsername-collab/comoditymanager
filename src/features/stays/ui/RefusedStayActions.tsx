import { Link } from "@/i18n/navigation";
import { CancelledStayUndoButton } from "@/features/cazari/ui/CancelledStayUndoButton";
import type { CancelledStay, CazariLabels } from "@/features/cazari/ui/types";

export function RefusedStayActions({
  stay,
  labels,
  returnTo,
}: {
  stay: CancelledStay;
  labels: CazariLabels;
  returnTo: string;
}) {
  const bookingHref = `/admin/bookings/${stay.id}?return_to=${encodeURIComponent(returnTo)}`;

  return (
    <div className="stay-card__actions stay-card__actions--refused">
      <CancelledStayUndoButton
        bookingId={stay.id}
        label={labels.acceptAgain}
        confirmLabel={labels.undoCancelConfirm}
      />
      <Link
        href={bookingHref}
        className="admin-btn admin-btn--secondary admin-btn--sm admin-btn--full stay-card__open-booking"
      >
        {labels.openBooking}
      </Link>
    </div>
  );
}
