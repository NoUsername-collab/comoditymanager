import { Link } from "@/i18n/navigation";
import { CancelledStayUndoButton } from "@/components/admin/cazari/CancelledStayUndoButton";
import type { CancelledStay, CazariLabels } from "@/components/admin/cazari/types";

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
    <div className="flex shrink-0 flex-col items-stretch justify-center gap-1 sm:min-w-[140px]">
      <CancelledStayUndoButton
        bookingId={stay.id}
        label={labels.acceptAgain}
        confirmLabel={labels.undoCancelConfirm}
      />
      <Link
        href={bookingHref}
        className="inline-flex justify-center rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-50 active:translate-y-px"
      >
        {labels.openBooking}
      </Link>
    </div>
  );
}
