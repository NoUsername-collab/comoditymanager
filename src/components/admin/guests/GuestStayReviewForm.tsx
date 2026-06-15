import { saveGuestStayReviewAction } from "@/app/[locale]/admin/(panel)/guests/actions";
import { useTranslations } from "next-intl";
import type { GuestStayReviewRow } from "@/domain/guest/types";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { AdminTextarea } from "@/components/admin/ui/AdminInput";
import { GuestNoteStarsInput } from "@/components/admin/guests/GuestNoteStarsInput";

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

        <p className="text-xs text-zinc-500">{tGuests("review.noteStarsIntro")}</p>

        <div className="guest-stay-review-form__note block space-y-2 text-sm">
          <span className="font-bold text-emerald-800">{tGuests("review.positiveNote")}</span>
          <GuestNoteStarsInput
            name="positive_stars"
            variant="positive"
            defaultValue={review?.positive_stars ?? 3}
          />
          <AdminTextarea
            name="positive_note"
            rows={3}
            defaultValue={review?.positive_note ?? ""}
            placeholder={tGuests("review.positiveNotePlaceholder")}
            className="border-emerald-200 bg-emerald-50/40"
          />
        </div>

        <div className="guest-stay-review-form__note block space-y-2 text-sm">
          <span className="font-bold text-red-800">{tGuests("review.negativeNote")}</span>
          <GuestNoteStarsInput
            name="negative_stars"
            variant="negative"
            defaultValue={review?.negative_stars ?? 3}
          />
          <AdminTextarea
            name="negative_note"
            rows={3}
            defaultValue={review?.negative_note ?? ""}
            placeholder={tGuests("review.negativeNotePlaceholder")}
            className="border-red-200 bg-red-50/40"
          />
        </div>

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
