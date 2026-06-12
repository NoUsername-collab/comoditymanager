import { saveGuestStayReviewAction } from "@/app/[locale]/admin/(panel)/guests/actions";
import { useTranslations } from "next-intl";
import type { GuestStayReviewRow } from "@/domain/guest/types";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";

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

        <div className="guest-stay-review-form__metrics grid gap-4 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="font-bold">{tGuests("review.stars")}</span>
            <select
              name="stars"
              defaultValue={String(review?.stars ?? 5)}
              className="w-full border border-zinc-300 bg-white px-3 py-2"
            >
              <option value="5">{tGuests("review.starsOption", { count: 5 })}</option>
              <option value="4">{tGuests("review.starsOption", { count: 4 })}</option>
              <option value="3">{tGuests("review.starsOption", { count: 3 })}</option>
              <option value="2">{tGuests("review.starsOption", { count: 2 })}</option>
              <option value="1">{tGuests("review.starOption", { count: 1 })}</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-bold">{tGuests("review.trustAdjustment")}</span>
            <input
              name="trust_delta"
              type="number"
              min={-40}
              max={40}
              defaultValue={review?.trust_delta ?? 0}
              className="w-full border border-zinc-300 px-3 py-2"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-bold">{tGuests("review.loyaltyAdjustment")}</span>
            <input
              name="loyalty_delta"
              type="number"
              min={-20}
              max={20}
              defaultValue={review?.loyalty_delta ?? 0}
              className="w-full border border-zinc-300 px-3 py-2"
            />
          </label>
        </div>

        <label className="guest-stay-review-form__note block space-y-1 text-sm">
          <span className="font-bold text-emerald-800">{tGuests("review.positiveNote")}</span>
          <textarea
            name="positive_note"
            rows={3}
            defaultValue={review?.positive_note ?? ""}
            placeholder={tGuests("review.positiveNotePlaceholder")}
            className="w-full border border-emerald-200 bg-emerald-50/40 px-3 py-2"
          />
        </label>

        <label className="guest-stay-review-form__note block space-y-1 text-sm">
          <span className="font-bold text-red-800">{tGuests("review.negativeNote")}</span>
          <textarea
            name="negative_note"
            rows={3}
            defaultValue={review?.negative_note ?? ""}
            placeholder={tGuests("review.negativeNotePlaceholder")}
            className="w-full border border-red-200 bg-red-50/40 px-3 py-2"
          />
        </label>

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
