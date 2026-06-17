import { saveGuestStayReviewAction } from "@/app/[locale]/admin/(panel)/guests/actions";
import { useTranslations } from "next-intl";
import type { GuestStayReviewRow } from "@/domain/guest/types";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { GuestStayRatingFields } from "@/components/admin/guests/GuestStayRatingFields";

export function GuestStayReviewForm({
  guestId,
  bookingId,
  review,
}: {
  guestId: string;
  bookingId: string;
  review: GuestStayReviewRow | null;
}) {
  const tGuests = useTranslations("admin.guests");

  return (
    <details className="guest-stay-review-form mt-3 rounded border border-zinc-200 bg-zinc-50 p-3">
      <summary className="guest-stay-review-form__summary cursor-pointer text-sm font-semibold text-zinc-800">
        {review ? tGuests("review.editStayReview") : tGuests("review.rateStay")}
      </summary>

      <AdminPendingForm
        action={saveGuestStayReviewAction}
        className="guest-stay-review-form__form mt-4 space-y-4"
      >
        <input type="hidden" name="guest_id" value={guestId} />
        <input type="hidden" name="booking_id" value={bookingId} />

        <GuestStayRatingFields initialReview={review} />

        <AdminSubmitButton
          type="submit"
          pendingLabel={tGuests("review.saving")}
          className="guest-stay-review-form__submit admin-cereri-fill px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {tGuests("review.saveStayReview")}
        </AdminSubmitButton>
      </AdminPendingForm>
    </details>
  );
}
