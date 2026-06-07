import { Link } from "@/i18n/navigation";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { formatBookingRef } from "@/lib/booking-admin-links";
import { addDays, formatIso, formatRoDate, parseIso, todayIso } from "@/lib/stay-dates";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";
import { AdminStaySearchForm } from "@/components/admin/AdminStaySearchForm";
import { BookingCancelButton } from "@/components/admin/BookingCancelButton";
import { GuestFlagPill } from "@/components/admin/guests/GuestFlagPill";
import { GuestScoreHint } from "@/components/admin/guests/GuestScoreHint";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import { StayQuickOps } from "@/components/admin/cazari/StayQuickOps";
import { CancelledStayUndoButton } from "@/components/admin/cazari/CancelledStayUndoButton";
import {
  listCancelledStayHistory,
  listCompletedStayHistory,
  listOperationalStays,
} from "@/services/bookings";
import { cancelBookingAction } from "../bookings/actions";
import { getTranslations } from "next-intl/server";

type OperationalStay = Awaited<ReturnType<typeof listOperationalStays>>[number];
type HistoryStay = Awaited<ReturnType<typeof listCompletedStayHistory>>[number];
type CancelledStay = Awaited<ReturnType<typeof listCancelledStayHistory>>[number];
type StayCardRow = OperationalStay | CancelledStay;

type CazariTab = "ops" | "refuzate";

type CazariLabels = {
  noContact: string;
  noRoom: string;
  statusConfirmed: string;
  statusRequest: string;
  statusCancelled: string;
  details: string;
  refusedHint: string;
  refusedEmpty: string;
  refusedEmptyDesc: string;
  refusedEmptyFilter: string;
  refusedEmptyFilterDesc: string;
  historyCancelledSection: (count: number) => string;
  historyCancelledHint: string;
  historyCancelledBadge: string;
  historyCancelledAt: (date: string) => string;
  historyCompletedSection: string;
  tabOperational: string;
  tabRefused: string;
  refusedBrowseBookings: string;
  cancelStay: string;
  cancelRequest: string;
  guestsShort: (adults: number, children: number) => string;
  cancelConfirmedMsg: (ref: string, name: string, period: string) => string;
  cancelRequestMsg: (ref: string, name: string, period: string) => string;
  emptyConfirmed: { title: string; description: string; href: string; label: string };
  emptyRequest: { title: string; description: string; href: string; label: string };
  historyFiltered: (count: number) => string;
  historyRecent: (count: number) => string;
  historyFilteredHint: string;
  historyRecentHint: string;
  tryOtherCriteria: string;
  historyWillAppear: string;
  historyEmptyFilter: string;
  historyEmpty: string;
  checkout: string;
  openBooking: string;
  acceptAgain: string;
  acceptAgainHint: string;
  undoCancelConfirm: string;
  openClientProfile: string;
  checkIn: string;
  edit: string;
  movePrevDay: string;
  moveNextDay: string;
  checkoutNeedsCheckin: string;
  checkoutAlreadyDone: string;
  checkActionsOnlyConfirmed: string;
  moveOnlyConfirmed: string;
  phoneRequiredForCheckIn: string;
  behaviorShort: string;
  loyaltyShort: string;
  starsShort: string;
  groupedToday: (count: number) => string;
  groupedThisWeek: (count: number) => string;
  groupedThisMonth: (count: number) => string;
  groupedUpcoming: (count: number) => string;
  groupedTodayHint: string;
  groupedThisWeekHint: string;
  groupedThisMonthHint: string;
  groupedUpcomingHint: string;
  groupedOutsideWindow: (count: number) => string;
  horizonToday: string;
  horizonWeek: string;
  horizon30d: string;
  horizon60d: string;
  horizon180d: string;
  horizon365d: string;
  loadMore: string;
  visibleWindow: string;
};

type HorizonKey = "1d" | "7d" | "30d" | "60d" | "180d" | "365d";

const HORIZON_DAYS: Record<HorizonKey, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "60d": 60,
  "180d": 180,
  "365d": 365,
};

function readHorizon(input: string | string[] | undefined): HorizonKey {
  const value = firstQueryValue(input).trim();
  if (value === "1d" || value === "7d" || value === "60d" || value === "180d" || value === "365d") return value;
  return "30d";
}

function readCazariTab(input: string | string[] | undefined): CazariTab {
  const value = firstQueryValue(input).trim();
  return value === "refuzate" ? "refuzate" : "ops";
}

function matchesCancelledQuery(stay: CancelledStay, rawQuery: string): boolean {
  return matchesStayQuery(stay, rawQuery);
}

function startOfWeekIso(iso: string): string {
  const d = parseIso(iso);
  const day = d.getDay();
  const shift = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + shift);
  return formatIso(d);
}

function endOfWeekIso(iso: string): string {
  return addDays(startOfWeekIso(iso), 6);
}

function startOfMonthIso(iso: string): string {
  const d = parseIso(iso);
  d.setDate(1);
  return formatIso(d);
}

function endOfMonthIso(iso: string): string {
  const d = parseIso(iso);
  d.setMonth(d.getMonth() + 1, 0);
  return formatIso(d);
}

function firstQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function normalizeSearchValue(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchesStayQuery(
  stay: OperationalStay | HistoryStay | CancelledStay,
  rawQuery: string
): boolean {
  const tokens = normalizeSearchValue(rawQuery)
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return true;

  const haystack = normalizeSearchValue(
    [
      stay.guest_name,
      stay.guest_first_name,
      stay.guest_last_name,
      stay.guest_email,
      stay.guest_phone,
      stay.room_names.join(" "),
      formatBookingRef(stay.id),
      stay.id,
    ]
      .filter(Boolean)
      .join(" ")
  );

  return tokens.every((token) => haystack.includes(token));
}

function StayMetricChip({
  label,
  value,
  tone = "zinc",
}: {
  label: string;
  value: number;
  tone?: "zinc" | "amber" | "emerald" | "sky" | "red";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : tone === "sky"
          ? "border-sky-200 bg-sky-50 text-sky-900"
          : tone === "red"
            ? "border-red-200 bg-red-50 text-red-900"
            : "border-zinc-200 bg-zinc-50 text-zinc-800";

  return (
    <div className={["rounded-md border px-3 py-2", toneClass].join(" ")}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
        {label}
      </p>
      <p className="mt-1 text-lg font-black leading-none">{value}</p>
    </div>
  );
}

function StayList({
  title,
  subtitle,
  items,
  variant,
  returnTo,
  hasQuery,
  labels,
}: {
  title: string;
  subtitle?: string;
  items: StayCardRow[];
  variant: "cereri" | "confirmate" | "refuzate";
  returnTo: string;
  hasQuery: boolean;
  labels: CazariLabels;
}) {
  const emptyState =
    variant === "confirmate"
      ? {
          emoji: "🛏",
          ...labels.emptyConfirmed,
        }
      : variant === "refuzate"
        ? {
            emoji: "⛔",
            title: hasQuery ? labels.refusedEmptyFilter : labels.refusedEmpty,
            description: hasQuery
              ? labels.refusedEmptyFilterDesc
              : labels.refusedEmptyDesc,
            href: "/admin/bookings",
            label: labels.refusedBrowseBookings,
          }
        : {
            emoji: "📬",
            ...labels.emptyRequest,
          };

  const rowClass =
    variant === "refuzate"
      ? "stay-card stay-card--red grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto]"
      : variant === "cereri"
        ? "stay-card stay-card--yellow grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto]"
        : "stay-card stay-card--green grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto]";

  return (
    <RetroXpWindow title={title} className="mb-6">
      {subtitle ? (
        <p className="mb-2 text-[11px] text-zinc-500">{subtitle}</p>
      ) : null}
      {variant === "refuzate" ? (
        <p className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-900">
          {labels.refusedHint}
        </p>
      ) : null}
      {items.length === 0 ? (
        <AdminEmptyState
          emoji={emptyState.emoji}
          title={emptyState.title}
          description={emptyState.description}
          actionHref={"href" in emptyState ? emptyState.href : undefined}
          actionLabel={"label" in emptyState ? emptyState.label : undefined}
        />
      ) : (
        <ul className="space-y-2">
          {items.map((stay) => (
            <li key={stay.id} className={rowClass}>
              <StayInfo
                stay={stay}
                labels={labels}
                variant={variant === "refuzate" ? "refuzate" : "operational"}
              />
              {variant === "refuzate" ? (
                <RefusedStayActions
                  stay={stay as CancelledStay}
                  labels={labels}
                  returnTo={returnTo}
                />
              ) : (
                <StayActions
                  stay={stay as OperationalStay}
                  returnTo={returnTo}
                  labels={labels}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </RetroXpWindow>
  );
}

function RefusedStayActions({
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

function StayInfo({
  stay,
  labels,
  variant = "operational",
}: {
  stay: StayCardRow;
  labels: CazariLabels;
  variant?: "operational" | "refuzate";
}) {
  const isConfirmed = stay.status === "confirmata";
  const isCancelled = stay.status === "anulata" || variant === "refuzate";

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p
              className={[
                "truncate text-[13px] font-bold leading-tight",
                isCancelled ? "text-red-950" : "text-zinc-900",
              ].join(" ")}
            >
              {stay.guest_name}
            </p>
            <GuestFlagPill flagLevel={stay.guest_alert_level} />
          </div>
          <p className="truncate text-[10px] leading-tight text-zinc-500">
            {[stay.guest_phone, stay.guest_email].filter(Boolean).join(" · ") ||
              labels.noContact}
          </p>
        </div>
        <span
          className={[
            "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide leading-none",
            isCancelled
              ? "border-red-300 bg-red-100 text-red-900"
              : isConfirmed
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-900",
          ].join(" ")}
        >
          {isCancelled
            ? labels.statusCancelled
            : isConfirmed
              ? labels.statusConfirmed
              : labels.statusRequest}
        </span>
      </div>

      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-zinc-600">
        <span className="font-medium text-zinc-700">
          {formatStayPeriod(stay.check_in, stay.check_out)}
        </span>
        <span aria-hidden>·</span>
        <span>{labels.guestsShort(stay.num_adults, stay.num_children)}</span>
        {stay.room_names.length > 0 ? (
          <span className="rounded bg-zinc-100 px-1 py-0.5 text-[9px]">
            {stay.room_names.join(", ")}
          </span>
        ) : (
          <span className="rounded bg-zinc-100 px-1 py-0.5 text-[9px]">{labels.noRoom}</span>
        )}
        {isConfirmed && stay.total_price != null ? (
          <span className="rounded bg-emerald-50 px-1 py-0.5 text-[9px] text-emerald-800">
            {stay.total_price} RON
          </span>
        ) : null}
        <span className="font-mono text-[9px] text-zinc-400">
          {formatBookingRef(stay.id)}
        </span>
      </div>

      {stay.guest_profile ? (
        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[9px] text-zinc-500">
          <span className="inline-flex items-center gap-0.5 rounded bg-zinc-100 px-1 py-0.5">
            {labels.behaviorShort}: {stay.guest_profile.trust_score}
            <GuestScoreHint kind="trust" />
          </span>
          <span className="inline-flex items-center gap-0.5 rounded bg-zinc-100 px-1 py-0.5">
            {labels.loyaltyShort}: {stay.guest_profile.loyalty_score}
            <GuestScoreHint kind="loyalty" />
          </span>
          <span className="inline-flex items-center gap-0.5 rounded bg-zinc-100 px-1 py-0.5">
            {labels.starsShort}: {stay.guest_profile.stars_avg.toFixed(1)}
            <GuestScoreHint kind="stars" />
          </span>
          {stay.guest_alert_note ? (
            <span className="truncate rounded bg-amber-50 px-1 py-0.5 text-amber-900">
              {stay.guest_alert_note}
            </span>
          ) : null}
        </div>
      ) : null}

      {stay.guest_id && (
        <Link
          href={`/admin/guests/${stay.guest_id}`}
          className="mt-0.5 inline-block text-[10px] font-bold text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
        >
          {labels.openClientProfile}
        </Link>
      )}
    </div>
  );
}

function StayActions({
  stay,
  returnTo,
  labels,
}: {
  stay: OperationalStay;
  returnTo: string;
  labels: CazariLabels;
}) {
  const period = formatStayPeriod(stay.check_in, stay.check_out, true);
  const ref = formatBookingRef(stay.id);
  const cancelMessage =
    stay.status === "confirmata"
      ? labels.cancelConfirmedMsg(ref, stay.guest_name, period)
      : labels.cancelRequestMsg(ref, stay.guest_name, period);

  return (
    <div className="flex shrink-0 flex-col items-stretch gap-1 sm:min-w-[270px]">
      <StayQuickOps
        bookingId={stay.id}
        bookingStatus={stay.status}
        guestName={stay.guest_name}
        guestPhone={stay.guest_phone}
        plannedCheckIn={stay.check_in}
        plannedCheckOut={stay.check_out}
        actualCheckInAt={stay.actual_check_in_at}
        actualCheckOutAt={stay.actual_check_out_at}
        labels={{
          checkIn: labels.checkIn,
          checkOut: labels.checkout,
          edit: labels.edit,
          movePrevDay: labels.movePrevDay,
          moveNextDay: labels.moveNextDay,
          checkoutNeedsCheckin: labels.checkoutNeedsCheckin,
          checkoutAlreadyDone: labels.checkoutAlreadyDone,
          checkActionsOnlyConfirmed: labels.checkActionsOnlyConfirmed,
          moveOnlyConfirmed: labels.moveOnlyConfirmed,
          phoneRequiredForCheckIn: labels.phoneRequiredForCheckIn,
        }}
      />
      <BookingCancelButton
        label={
          stay.status === "confirmata"
            ? labels.cancelStay
            : labels.cancelRequest
        }
        confirmMessage={cancelMessage}
        formAction={cancelBookingAction}
        bookingId={stay.id}
        returnTo={returnTo}
        variant="compact"
      />
    </div>
  );
}

function StayHistoryPanel({
  completedItems,
  cancelledItems,
  query,
  completedError,
  cancelledError,
  labels,
}: {
  completedItems: HistoryStay[];
  cancelledItems: CancelledStay[];
  query: string;
  completedError: string | null;
  cancelledError: string | null;
  labels: CazariLabels;
}) {
  const totalCount = completedItems.length + cancelledItems.length;

  return (
    <RetroXpWindow
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

        {completedError || cancelledError ? (
          <p className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {completedError ?? cancelledError}
          </p>
        ) : null}

        {cancelledItems.length > 0 ? (
          <section className="space-y-1.5">
            <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5">
              <p className="text-[11px] font-bold text-red-900">
                {labels.historyCancelledSection(cancelledItems.length)}
              </p>
              <p className="text-[10px] text-red-800/90 leading-tight">
                {labels.historyCancelledHint}
              </p>
            </div>
            <ul className="space-y-1.5">
              {cancelledItems.map((stay) => (
                <li
                  key={stay.id}
                  className="stay-card stay-card--red"
                >
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
                    <span className="font-medium">{formatStayPeriod(stay.check_in, stay.check_out, true)}</span>
                    <span aria-hidden>·</span>
                    <span>{labels.guestsShort(stay.num_adults, stay.num_children)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-1 text-[9px] text-red-800/60">
                    <span>{stay.room_names.join(", ") || labels.noRoom}</span>
                    <span className="font-mono">{formatBookingRef(stay.id)}</span>
                    <span aria-hidden>·</span>
                    <span>{labels.historyCancelledAt(formatRoDate(stay.updated_at.slice(0, 10)))}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <CancelledStayUndoButton
                      bookingId={stay.id}
                      label={labels.acceptAgain}
                      confirmLabel={labels.undoCancelConfirm}
                    />
                    <Link
                      href={`/admin/bookings/${stay.id}?return_to=${encodeURIComponent("/admin/cazari")}`}
                      className="text-[10px] font-semibold text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
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
                <li
                  key={stay.id}
                  className="stay-card stay-card--green"
                >
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-[12px] font-bold leading-tight text-zinc-900">
                      {stay.guest_name}
                    </p>
                    <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-bold leading-none text-emerald-800">
                      {labels.checkout} {formatRoDate(stay.check_out)}
                    </span>
                  </div>
                  <p className="truncate text-[10px] leading-tight text-zinc-500">
                    {[stay.guest_phone, stay.guest_email]
                      .filter(Boolean)
                      .join(" · ") || labels.noContact}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0 text-[10px] text-zinc-600">
                    <span className="font-medium">{formatStayPeriod(stay.check_in, stay.check_out, true)}</span>
                    <span aria-hidden>·</span>
                    <span>{labels.guestsShort(stay.num_adults, stay.num_children)}</span>
                    {stay.total_price != null ? (
                      <>
                        <span aria-hidden>·</span>
                        <span className="text-emerald-700">{stay.total_price} RON</span>
                      </>
                    ) : null}
                    <span className="font-mono text-[9px] text-zinc-400">{formatBookingRef(stay.id)}</span>
                  </div>
                  <Link
                    href={`/admin/bookings/${stay.id}`}
                    className="mt-0.5 inline-flex text-[10px] font-semibold text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
                  >
                    {labels.openBooking}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {totalCount === 0 && !completedError && !cancelledError ? (
          <AdminEmptyState
            emoji="🕘"
            title={query ? labels.historyEmptyFilter : labels.historyEmpty}
            description={
              query ? labels.tryOtherCriteria : labels.historyWillAppear
            }
          />
        ) : null}
      </div>
    </RetroXpWindow>
  );
}

function ConfirmedBuckets({
  items,
  today: todayProp,
  returnTo,
  hasQuery,
  labels,
}: {
  items: OperationalStay[];
  today?: string;
  returnTo: string;
  hasQuery: boolean;
  labels: CazariLabels;
}) {
  const today = todayProp ?? todayIso();
  const weekStart = startOfWeekIso(today);
  const weekEnd = endOfWeekIso(today);
  const monthStart = startOfMonthIso(today);
  const monthEnd = endOfMonthIso(today);

  const todayItems: OperationalStay[] = [];
  const weekItems: OperationalStay[] = [];
  const monthItems: OperationalStay[] = [];
  const upcomingItems: OperationalStay[] = [];

  for (const stay of items) {
    if (stay.check_in <= today && stay.check_out > today) {
      todayItems.push(stay);
    } else if (stay.check_in >= weekStart && stay.check_in <= weekEnd) {
      weekItems.push(stay);
    } else if (stay.check_in >= monthStart && stay.check_in <= monthEnd) {
      monthItems.push(stay);
    } else {
      upcomingItems.push(stay);
    }
  }

  const groups: Array<{ key: string; title: string; subtitle: string; stays: OperationalStay[] }> = [
    {
      key: "today",
      title: labels.groupedToday(todayItems.length),
      subtitle: labels.groupedTodayHint,
      stays: todayItems,
    },
    {
      key: "week",
      title: labels.groupedThisWeek(weekItems.length),
      subtitle: labels.groupedThisWeekHint,
      stays: weekItems,
    },
    {
      key: "month",
      title: labels.groupedThisMonth(monthItems.length),
      subtitle: labels.groupedThisMonthHint,
      stays: monthItems,
    },
    {
      key: "upcoming",
      title: labels.groupedUpcoming(upcomingItems.length),
      subtitle: labels.groupedUpcomingHint,
      stays: upcomingItems,
    },
  ];

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <StayList
          key={group.key}
          title={group.title}
          subtitle={group.subtitle}
          items={group.stays}
          variant="confirmate"
          returnTo={returnTo}
          hasQuery={hasQuery}
          labels={labels}
        />
      ))}
    </div>
  );
}

function buildCazariPageHref(opts: {
  q?: string;
  h?: HorizonKey;
  tab?: CazariTab;
}): string {
  const params = new URLSearchParams();
  if (opts.q) params.set("q", opts.q);
  if (opts.h && opts.h !== "30d") params.set("h", opts.h);
  if (opts.tab && opts.tab !== "ops") params.set("tab", opts.tab);
  const qs = params.toString();
  return qs ? `/admin/cazari?${qs}` : "/admin/cazari";
}

export default async function AdminCazariPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    h?: string | string[];
    tab?: string | string[];
    reaccepted?: string;
  }>;
}) {
  const tPages = await getTranslations("admin.pages.cazari");
  const tCommon = await getTranslations("admin.common");
  const tFlow = await getTranslations("booking.flowStatus");
  const params = await searchParams;
  const q = firstQueryValue(params.q).trim();
  const horizon = readHorizon(params.h);
  const tab = readCazariTab(params.tab);
  const effectiveToday = await getEffectiveToday();
  const horizonEnd = addDays(effectiveToday, HORIZON_DAYS[horizon]);

  const labels: CazariLabels = {
    noContact: tCommon("noContact"),
    noRoom: tPages("noRoomBadge"),
    statusConfirmed: tFlow("confirmata"),
    statusRequest: tFlow("cerere_noua"),
    statusCancelled: tFlow("anulata"),
    details: tCommon("details"),
    refusedHint: tPages("refusedHint"),
    refusedEmpty: tPages("refusedEmpty"),
    refusedEmptyDesc: tPages("refusedEmptyDesc"),
    refusedEmptyFilter: tPages("refusedEmptyFilter"),
    refusedEmptyFilterDesc: tPages("refusedEmptyFilterDesc"),
    historyCancelledSection: (count) =>
      tPages("historyCancelledSection", { count }),
    historyCancelledHint: tPages("historyCancelledHint"),
    historyCancelledBadge: tPages("historyCancelledBadge"),
    historyCancelledAt: (date) => tPages("historyCancelledAt", { date }),
    tabOperational: tPages("tabOperational"),
    tabRefused: tPages("tabRefused"),
    refusedBrowseBookings: tPages("refusedBrowseBookings"),
    historyCompletedSection: tPages("historyCompletedSection"),
    cancelStay: tPages("cancelStay"),
    cancelRequest: tPages("cancelRequest"),
    guestsShort: (adults, children) =>
      tCommon("guestsShort", { adults, children }),
    cancelConfirmedMsg: (ref, name, period) =>
      tPages("cancelConfirmedMsg", { ref, name, period }),
    cancelRequestMsg: (ref, name, period) =>
      tPages("cancelRequestMsg", { ref, name, period }),
    emptyConfirmed: {
      title: tPages("emptyConfirmedFilter"),
      description: tPages("emptyConfirmedFilterDesc"),
      href: "/admin/calendar",
      label: tPages("openCalendar"),
    },
    emptyRequest: {
      title: tPages("emptyRequestWaiting"),
      description: tPages("emptyRequestWaitingDesc"),
      href: "/admin/bookings",
      label: tPages("seeNewRequests"),
    },
    historyFiltered: (count) => tPages("historyFiltered", { count }),
    historyRecent: (count) => tPages("historyRecent", { count }),
    historyFilteredHint: tPages("historyFilteredHint"),
    historyRecentHint: tPages("historyRecentHint"),
    tryOtherCriteria: tPages("tryOtherCriteria"),
    historyWillAppear: tPages("historyWillAppear"),
    historyEmptyFilter: tPages("historyEmptyFilter"),
    historyEmpty: tPages("historyEmpty"),
    checkout: tCommon("checkout"),
    openBooking: tCommon("openBooking"),
    acceptAgain: tPages("acceptAgain"),
    acceptAgainHint: tPages("acceptAgainHint"),
    undoCancelConfirm: tPages("undoCancelConfirm"),
    openClientProfile: tPages("openClientProfile"),
    checkIn: tCommon("checkIn"),
    edit: tCommon("edit"),
    movePrevDay: tPages("movePrevDay"),
    moveNextDay: tPages("moveNextDay"),
    checkoutNeedsCheckin: tPages("checkoutNeedsCheckin"),
    checkoutAlreadyDone: tPages("checkoutAlreadyDone"),
    checkActionsOnlyConfirmed: tPages("checkActionsOnlyConfirmed"),
    moveOnlyConfirmed: tPages("moveOnlyConfirmed"),
    phoneRequiredForCheckIn: tPages("phoneRequiredForCheckIn"),
    behaviorShort: tPages("behaviorShort"),
    loyaltyShort: tPages("loyaltyShort"),
    starsShort: tPages("starsShort"),
    groupedToday: (count) => tPages("groupedToday", { count }),
    groupedThisWeek: (count) => tPages("groupedThisWeek", { count }),
    groupedThisMonth: (count) => tPages("groupedThisMonth", { count }),
    groupedUpcoming: (count) => tPages("groupedUpcoming", { count }),
    groupedTodayHint: tPages("groupedTodayHint"),
    groupedThisWeekHint: tPages("groupedThisWeekHint"),
    groupedThisMonthHint: tPages("groupedThisMonthHint"),
    groupedUpcomingHint: tPages("groupedUpcomingHint"),
    groupedOutsideWindow: (count) => tPages("groupedOutsideWindow", { count }),
    horizonToday: tPages("horizonToday"),
    horizonWeek: tPages("horizonWeek"),
    horizon30d: tPages("horizon30d"),
    horizon60d: tPages("horizon60d"),
    horizon180d: tPages("horizon180d"),
    horizon365d: tPages("horizon365d"),
    loadMore: tPages("loadMore"),
    visibleWindow: tPages("visibleWindow"),
  };

  let stays: OperationalStay[] = [];
  let history: HistoryStay[] = [];
  let cancelledHistory: CancelledStay[] = [];
  let staysError: string | null = null;
  let historyError: string | null = null;
  let cancelledHistoryError: string | null = null;

  const [staysResult, historyResult, cancelledResult] = await Promise.allSettled([
    listOperationalStays(),
    listCompletedStayHistory(28),
    listCancelledStayHistory(28),
  ]);

  if (staysResult.status === "fulfilled") {
    stays = staysResult.value;
  } else {
    staysError =
      staysResult.reason instanceof Error
        ? staysResult.reason.message
        : tCommon("error");
  }

  if (historyResult.status === "fulfilled") {
    history = historyResult.value;
  } else {
    historyError =
      historyResult.reason instanceof Error
        ? historyResult.reason.message
        : tPages("historyEmpty");
  }

  if (cancelledResult.status === "fulfilled") {
    cancelledHistory = cancelledResult.value;
  } else {
    cancelledHistoryError =
      cancelledResult.reason instanceof Error
        ? cancelledResult.reason.message
        : tCommon("error");
  }

  const filteredStays = q ? stays.filter((stay) => matchesStayQuery(stay, q)) : stays;
  const filteredHistory = q
    ? history.filter((stay) => matchesStayQuery(stay, q))
    : history;
  const filteredCancelledHistory = q
    ? cancelledHistory.filter((stay) => matchesCancelledQuery(stay, q))
    : cancelledHistory;
  const filteredRefused = filteredCancelledHistory;
  const cereri = filteredStays.filter((s) => s.status === "cerere_noua");
  const confirmate = filteredStays.filter((s) => s.status === "confirmata");
  const confirmateVisible = confirmate.filter(
    (s) => s.check_in <= horizonEnd || (s.check_in <= effectiveToday && s.check_out > effectiveToday)
  );
  const hiddenConfirmateCount = Math.max(0, confirmate.length - confirmateVisible.length);

  function buildHorizonHref(next: HorizonKey): string {
    return buildCazariPageHref({ q: q || undefined, h: next, tab });
  }

  function buildTabHref(next: CazariTab): string {
    return buildCazariPageHref({ q: q || undefined, h: horizon, tab: next });
  }

  const description = (
    <div className="space-y-1">
      <p className="max-w-3xl text-sm leading-relaxed">{tPages("hubDescription")}</p>
      <p className="text-xs text-zinc-500">{tPages("searchExamples")}</p>
    </div>
  );

  return (
    <AdminRetroPageFrame title={tPages("title")} description={description}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,30%)]">
        <div className="min-w-0">
          <RetroXpWindow title={tPages("searchFilter")} className="mb-6">
            <div className="space-y-3">
              <AdminStaySearchForm
                defaultQuery={q}
                preserveParams={{ tab: tab === "refuzate" ? "refuzate" : undefined, h: horizon }}
              />
              <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2">
                <Link
                  href={buildTabHref("ops")}
                  className={[
                    "rounded-md border px-3 py-1.5 text-xs font-semibold",
                    tab === "ops"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                  ].join(" ")}
                >
                  {labels.tabOperational}
                </Link>
                <Link
                  href={buildTabHref("refuzate")}
                  className={[
                    "rounded-md border px-3 py-1.5 text-xs font-semibold",
                    tab === "refuzate"
                      ? "border-red-300 bg-red-50 text-red-900"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                  ].join(" ")}
                >
                  {labels.tabRefused} ({filteredRefused.length})
                </Link>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                <StayMetricChip
                  label={q ? tPages("results") : tPages("operational")}
                  value={filteredStays.length}
                  tone="sky"
                />
                <StayMetricChip
                  label={tCommon("requests")}
                  value={cereri.length}
                  tone="amber"
                />
                <StayMetricChip
                  label={tCommon("confirmed")}
                  value={confirmate.length}
                  tone="emerald"
                />
                <StayMetricChip
                  label={tCommon("past")}
                  value={filteredHistory.length}
                  tone="zinc"
                />
                <StayMetricChip
                  label={labels.tabRefused}
                  value={filteredRefused.length}
                  tone="red"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold text-zinc-600">{labels.visibleWindow}</span>
                <Link
                  href={buildHorizonHref("1d")}
                  className={["rounded-full border px-2 py-0.5 text-[11px] font-semibold", horizon === "1d" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-zinc-200 bg-white text-zinc-700"].join(" ")}
                >
                  {labels.horizonToday}
                </Link>
                <Link
                  href={buildHorizonHref("7d")}
                  className={["rounded-full border px-2 py-0.5 text-[11px] font-semibold", horizon === "7d" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-zinc-200 bg-white text-zinc-700"].join(" ")}
                >
                  {labels.horizonWeek}
                </Link>
                <Link
                  href={buildHorizonHref("30d")}
                  className={["rounded-full border px-2 py-0.5 text-[11px] font-semibold", horizon === "30d" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-zinc-200 bg-white text-zinc-700"].join(" ")}
                >
                  {labels.horizon30d}
                </Link>
                <Link
                  href={buildHorizonHref("60d")}
                  className={["rounded-full border px-2 py-0.5 text-[11px] font-semibold", horizon === "60d" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-zinc-200 bg-white text-zinc-700"].join(" ")}
                >
                  {labels.horizon60d}
                </Link>
                <Link
                  href={buildHorizonHref("180d")}
                  className={["rounded-full border px-2 py-0.5 text-[11px] font-semibold", horizon === "180d" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-zinc-200 bg-white text-zinc-700"].join(" ")}
                >
                  {labels.horizon180d}
                </Link>
                <Link
                  href={buildHorizonHref("365d")}
                  className={["rounded-full border px-2 py-0.5 text-[11px] font-semibold", horizon === "365d" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-zinc-200 bg-white text-zinc-700"].join(" ")}
                >
                  {labels.horizon365d}
                </Link>
              </div>
            </div>
          </RetroXpWindow>

          {params.reaccepted === "1" && (
            <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {tPages("reacceptedBanner")}
            </p>
          )}

          {staysError && <p className="mb-4 text-sm text-red-800">{staysError}</p>}

          {tab === "refuzate" ? (
            <StayList
              title={`${labels.tabRefused} (${filteredRefused.length})`}
              items={filteredRefused}
              variant="refuzate"
              returnTo="/admin/cazari?tab=refuzate"
              hasQuery={!!q}
              labels={labels}
            />
          ) : (
            <>
              <StayList
                title={`${tCommon("requests")} (${cereri.length})`}
                items={cereri}
                variant="cereri"
                returnTo="/admin/cazari"
                hasQuery={!!q}
                labels={labels}
              />

              <RetroXpWindow
                title={tPages("confirmedTitle", { count: confirmateVisible.length })}
                className="mb-6"
              >
                {hiddenConfirmateCount > 0 && (
                  <p className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                    {labels.groupedOutsideWindow(hiddenConfirmateCount)}
                  </p>
                )}
                <ConfirmedBuckets
                  items={confirmateVisible}
                  today={effectiveToday}
                  returnTo="/admin/cazari"
                  hasQuery={!!q}
                  labels={{
                    ...labels,
                    emptyConfirmed: {
                      title: q
                        ? tPages("emptyConfirmedFilter")
                        : tPages("emptyConfirmedActive"),
                      description: q
                        ? tPages("emptyConfirmedFilterDesc")
                        : tPages("emptyConfirmedActiveDesc"),
                      href: "/admin/calendar",
                      label: tPages("openCalendar"),
                    },
                  }}
                />
                {horizon !== "365d" && (
                  <div className="mt-3">
                    <Link
                      href={buildHorizonHref(
                        horizon === "1d"
                          ? "7d"
                          : horizon === "7d"
                            ? "30d"
                            : horizon === "30d"
                              ? "60d"
                              : horizon === "60d"
                                ? "180d"
                                : "365d"
                      )}
                      className="inline-flex rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      {labels.loadMore}
                    </Link>
                  </div>
                )}
              </RetroXpWindow>
            </>
          )}
        </div>

        <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <StayHistoryPanel
            completedItems={filteredHistory}
            cancelledItems={filteredCancelledHistory}
            query={q}
            completedError={historyError}
            cancelledError={cancelledHistoryError}
            labels={labels}
          />
        </aside>
      </div>
    </AdminRetroPageFrame>
  );
}
