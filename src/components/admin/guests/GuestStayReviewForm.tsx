import { saveGuestStayReviewAction } from "@/app/[locale]/admin/(panel)/guests/actions";
import { useTranslations } from "next-intl";
import {
  GUEST_NEGATIVE_TRAITS,
  GUEST_POSITIVE_TRAITS,
} from "@/domain/guest/reputation";
import type { GuestStayReviewRow } from "@/domain/guest/types";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";

function TraitChecklist({
  title,
  name,
  options,
  labels,
  selected,
  tone,
}: {
  title: string;
  name: string;
  options: readonly string[];
  labels: Record<string, string>;
  selected: string[];
  tone: "good" | "bad";
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((trait) => (
          <label
            key={trait}
            className={[
              "guest-stay-review-form__trait-chip inline-flex items-center gap-2 rounded border px-2 py-1 text-xs font-medium",
              tone === "good"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900",
            ].join(" ")}
          >
            <input
              type="checkbox"
              name={name}
              value={trait}
              defaultChecked={selected.includes(trait)}
            />
            <span>{labels[trait]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

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
  const positiveLabels: Record<string, string> = Object.fromEntries(
    GUEST_POSITIVE_TRAITS.map((trait) => [
      trait,
      tGuests(`traits.positive.${trait}` as never),
    ])
  );
  const negativeLabels: Record<string, string> = Object.fromEntries(
    GUEST_NEGATIVE_TRAITS.map((trait) => [
      trait,
      tGuests(`traits.negative.${trait}` as never),
    ])
  );

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

        <TraitChecklist
          title={tGuests("review.goodTraits")}
          name="positive_traits"
          options={GUEST_POSITIVE_TRAITS}
          labels={positiveLabels}
          selected={review?.positive_traits ?? []}
          tone="good"
        />

        <TraitChecklist
          title={tGuests("review.problemTraits")}
          name="negative_traits"
          options={GUEST_NEGATIVE_TRAITS}
          labels={negativeLabels}
          selected={review?.negative_traits ?? []}
          tone="bad"
        />

        <label className="block space-y-1 text-sm">
          <span className="font-bold">{tGuests("review.problemDetails")}</span>
          <textarea
            name="problem_details"
            rows={3}
            defaultValue={review?.problem_details ?? ""}
            placeholder={tGuests("review.problemPlaceholder")}
            className="w-full border border-zinc-300 px-3 py-2"
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
