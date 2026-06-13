import { Link } from "@/i18n/navigation";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { formatBookingRef } from "@/lib/booking-admin-links";
import { formatRoDate } from "@/lib/stay-dates";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminPanel } from "@/components/admin/shell/AdminPanel";
import { CancelledStayUndoButton } from "@/components/admin/cazari/CancelledStayUndoButton";
import type {
  CancelledStay,
  CazariLabels,
  HistoryStay,
} from "@/components/admin/cazari/types";

export function StayHistoryPanel({
  completedItems,
  confirmedRecentItems,
  cancelledItems,
  query,
  completedError,
  confirmedRecentError,
  cancelledError,
  labels,
}: {
  completedItems: HistoryStay[];
  confirmedRecentItems: HistoryStay[];
  cancelledItems: CancelledStay[];
  query: string;
  completedError: string | null;
  confirmedRecentError: string | null;
  cancelledError: string | null;
  labels: CazariLabels;
}) {
  const totalCount =
    completedItems.length + confirmedRecentItems.length + cancelledItems.length;

  return (
    <AdminPanel
      title={
        query
          ? labels.historyFiltered(totalCount)
          : labels.historyRecent(totalCount)
      }
    >
      <div className="space-y-3">
        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          {query ? labels.historyFilteredHint : labels.historyRecentHint}
        </div>

        {completedError || confirmedRecentError || cancelledError ? (
          <p className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {completedError ?? confirmedRecentError ?? cancelledError}
          </p>
        ) : null}

        {confirmedRecentItems.length > 0 ? (
          <section className="space-y-1.5">
            <div className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5">
              <p className="text-[11px] font-bold text-sky-950">
                {labels.historyConfirmedRecentSection(confirmedRecentItems.length)}
              </p>
              <p className="text-[10px] leading-tight text-sky-900/90">
                {labels.historyConfirmedRecentHint}
              </p>
            </div>
            <ul className="space-y-1.5">
              {confirmedRecentItems.map((stay) => (
                <li key={stay.id} className="stay-card stay-card--yellow">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-[12px] font-bold leading-tight text-zinc-900">
                      {stay.guest_name}
                    </p>
                    <span className="shrink-0 rounded-full border border-sky-200 bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold leading-none text-sky-900">
                      {labels.historyConfirmedRecentBadge(formatRoDate(stay.check_in))}
                    </span>
                  </div>
                  <p className="truncate text-[10px] leading-tight text-zinc-500">
                    {[stay.guest_phone, stay.guest_email]
                      .filter(Boolean)
                      .join(" · ") || labels.noContact}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0 text-[10px] text-zinc-600">
                    <span className="font-medium">
                      {formatStayPeriod(stay.check_in, stay.check_out, true)}
                    </span>
                    <span aria-hidden>·</span>
                    <span>
                      {labels.guestsShort(stay.num_adults, stay.num_children)}
                    </span>
                    <span className="font-mono text-[9px] text-zinc-400">
                      {formatBookingRef(stay.id)}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    {stay.room_names.join(", ") || labels.noRoom}
                  </p>
                  <Link
                    href={`/admin/bookings/${stay.id}?return_to=${encodeURIComponent("/admin/cazari")}`}
                    className="stay-history-link mt-1 inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center text-sm font-semibold text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
                  >
                    {labels.openBooking}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {cancelledItems.length > 0 ? (
          <section className="space-y-1.5">
            <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5">
              <p className="text-[11px] font-bold text-red-900">
                {labels.historyCancelledSection(cancelledItems.length)}
              </p>
              <p className="text-[10px] leading-tight text-red-800/90">
                {labels.historyCancelledHint}
              </p>
            </div>
            <ul className="space-y-1.5">
              {cancelledItems.map((stay) => (
                <li key={stay.id} className="stay-card stay-card--red">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-[12px] font-bold leading-tight text-red-950">
                      {stay.guest_name}
                    </p>
                    <span className="shrink-0 rounded-full border border-red-300 bg-red-100 px-1.5 py-0.5 text-[9px] font-bold leading-none text-red-900">
                      {labels.historyCancelledBadge}
                    </span>
                  </div>
                  <p className="truncate text-[10px] leading-tight text-red-900/70">
                    {[stay.guest_phone, stay.guest_email]
                      .filter(Boolean)
                      .join(" · ") || labels.noContact}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0 text-[10px] text-red-900/80">
                    <span className="font-medium">
                      {formatStayPeriod(stay.check_in, stay.check_out, true)}
                    </span>
                    <span aria-hidden>·</span>
                    <span>
                      {labels.guestsShort(stay.num_adults, stay.num_children)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-1 text-[9px] text-red-800/60">
                    <span>{stay.room_names.join(", ") || labels.noRoom}</span>
                    <span className="font-mono">{formatBookingRef(stay.id)}</span>
                    <span aria-hidden>·</span>
                    <span>
                      {labels.historyCancelledAt(
                        formatRoDate(stay.updated_at.slice(0, 10))
                      )}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <CancelledStayUndoButton
                      bookingId={stay.id}
                      label={labels.acceptAgain}
                      confirmLabel={labels.undoCancelConfirm}
                    />
                    <Link
                      href={`/admin/bookings/${stay.id}?return_to=${encodeURIComponent("/admin/cazari")}`}
                      className="stay-history-link inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center text-sm font-semibold text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
                    >
                      {labels.openBooking}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {completedItems.length > 0 ? (
          <section className="space-y-1.5">
            {cancelledItems.length > 0 ? (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                {labels.historyCompletedSection}
              </p>
            ) : null}
            <ul className="space-y-1.5">
              {completedItems.map((stay) => (
                <li key={stay.id} className="stay-card stay-card--green">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-[12px] font-bold leading-tight text-zinc-900">
                      {stay.guest_name}
                    </p>
                    <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold leading-none text-emerald-800">
                      {labels.checkout} {formatRoDate(stay.check_out)}
                    </span>
                  </div>
                  <p className="truncate text-[10px] leading-tight text-zinc-500">
                    {[stay.guest_phone, stay.guest_email]
                      .filter(Boolean)
                      .join(" · ") || labels.noContact}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0 text-[10px] text-zinc-600">
                    <span className="font-medium">
                      {formatStayPeriod(stay.check_in, stay.check_out, true)}
                    </span>
                    <span aria-hidden>·</span>
                    <span>
                      {labels.guestsShort(stay.num_adults, stay.num_children)}
                    </span>
                    {stay.total_price != null ? (
                      <>
                        <span aria-hidden>·</span>
                        <span className="text-emerald-700">
                          {stay.total_price} RON
                        </span>
                      </>
                    ) : null}
                    <span className="font-mono text-[9px] text-zinc-400">
                      {formatBookingRef(stay.id)}
                    </span>
                  </div>
                  <Link
                    href={`/admin/bookings/${stay.id}`}
                    className="stay-history-link mt-1 inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center text-sm font-semibold text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
                  >
                    {labels.openBooking}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {totalCount === 0 &&
        !completedError &&
        !confirmedRecentError &&
        !cancelledError ? (
          <AdminEmptyState
            emoji="🕘"
            title={query ? labels.historyEmptyFilter : labels.historyEmpty}
            description={
              query ? labels.tryOtherCriteria : labels.historyWillAppear
            }
          />
        ) : null}
      </div>
    </AdminPanel>
  );
}
