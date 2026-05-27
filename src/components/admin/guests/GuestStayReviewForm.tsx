import { saveGuestStayReviewAction } from "@/app/admin/(panel)/guests/actions";
import {
  GUEST_NEGATIVE_TRAITS,
  GUEST_NEGATIVE_TRAIT_LABELS,
  GUEST_POSITIVE_TRAITS,
  GUEST_POSITIVE_TRAIT_LABELS,
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
              "inline-flex items-center gap-2 rounded border px-2 py-1 text-xs font-medium",
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
  return (
    <details className="mt-3 rounded border border-zinc-200 bg-zinc-50 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-zinc-800">
        {review ? "Editează review-ul sejurului" : "Evaluează acest sejur"}
      </summary>

      <AdminPendingForm
        action={saveGuestStayReviewAction}
        className="mt-4 space-y-4"
      >
        <input type="hidden" name="guest_id" value={guestId} />
        <input type="hidden" name="booking_id" value={bookingId} />

        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="font-bold">Stele</span>
            <select
              name="stars"
              defaultValue={String(review?.stars ?? 5)}
              className="w-full border border-zinc-300 bg-white px-3 py-2"
            >
              <option value="5">5 stele</option>
              <option value="4">4 stele</option>
              <option value="3">3 stele</option>
              <option value="2">2 stele</option>
              <option value="1">1 stea</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-bold">Ajustare trust</span>
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
            <span className="font-bold">Ajustare fidelitate</span>
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
          title="Trăsături bune"
          name="positive_traits"
          options={GUEST_POSITIVE_TRAITS}
          labels={GUEST_POSITIVE_TRAIT_LABELS}
          selected={review?.positive_traits ?? []}
          tone="good"
        />

        <TraitChecklist
          title="Trăsături problematice"
          name="negative_traits"
          options={GUEST_NEGATIVE_TRAITS}
          labels={GUEST_NEGATIVE_TRAIT_LABELS}
          selected={review?.negative_traits ?? []}
          tone="bad"
        />

        <label className="block space-y-1 text-sm">
          <span className="font-bold">Detalii problemă / context</span>
          <textarea
            name="problem_details"
            rows={3}
            defaultValue={review?.problem_details ?? ""}
            placeholder="Ce s-a întâmplat, cum s-a rezolvat, ce trebuie știe staff-ul data viitoare."
            className="w-full border border-zinc-300 px-3 py-2"
          />
        </label>

        <AdminSubmitButton
          type="submit"
          pendingLabel="Salvez review-ul…"
          className="admin-cereri-fill px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          Salvează review sejur
        </AdminSubmitButton>
      </AdminPendingForm>
    </details>
  );
}
