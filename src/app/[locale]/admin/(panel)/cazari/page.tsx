import { Link } from "@/i18n/navigation";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { formatBookingRef } from "@/lib/booking-admin-links";
import { formatRoDate } from "@/lib/stay-dates";
import { AdminStaySearchForm } from "@/components/admin/AdminStaySearchForm";
import { BookingCancelButton } from "@/components/admin/BookingCancelButton";
import { GuestProfileBadges } from "@/components/admin/guests/GuestProfileBadges";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import {
  listCompletedStayHistory,
  listOperationalStays,
} from "@/services/bookings";
import { cancelBookingAction } from "../bookings/actions";
import { getTranslations } from "next-intl/server";

type OperationalStay = Awaited<ReturnType<typeof listOperationalStays>>[number];
type HistoryStay = Awaited<ReturnType<typeof listCompletedStayHistory>>[number];

type CazariLabels = {
  noContact: string;
  noRoom: string;
  statusConfirmed: string;
  statusRequest: string;
  details: string;
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
};

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
  stay: OperationalStay | HistoryStay,
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
  tone?: "zinc" | "amber" | "emerald" | "sky";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : tone === "sky"
          ? "border-sky-200 bg-sky-50 text-sky-900"
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
  items,
  variant,
  returnTo,
  hasQuery,
  labels,
}: {
  title: string;
  items: OperationalStay[];
  variant: "cereri" | "confirmate";
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
      : {
          emoji: "📬",
          ...labels.emptyRequest,
        };

  return (
    <RetroXpWindow title={title} className="mb-6">
      {items.length === 0 ? (
        <AdminEmptyState
          emoji={emptyState.emoji}
          title={emptyState.title}
          description={emptyState.description}
          actionHref={emptyState.href}
          actionLabel={emptyState.label}
        />
      ) : (
        <ul className="space-y-2">
          {items.map((stay) => (
            <li
              key={stay.id}
              className="grid gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <StayInfo stay={stay} labels={labels} />
              <StayActions stay={stay} returnTo={returnTo} labels={labels} />
            </li>
          ))}
        </ul>
      )}
    </RetroXpWindow>
  );
}

function StayInfo({
  stay,
  labels,
}: {
  stay: OperationalStay;
  labels: CazariLabels;
}) {
  const isConfirmed = stay.status === "confirmata";

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-zinc-900">{stay.guest_name}</p>
          <p className="truncate text-xs text-zinc-600">
            {[stay.guest_phone, stay.guest_email].filter(Boolean).join(" · ") ||
              labels.noContact}
          </p>
          <GuestProfileBadges
            profile={stay.guest_profile}
            alertLevel={stay.guest_alert_level}
            alertNote={stay.guest_alert_note}
          />
        </div>
        <span
          className={[
            "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            isConfirmed
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-900",
          ].join(" ")}
        >
          {isConfirmed ? labels.statusConfirmed : labels.statusRequest}
        </span>
      </div>

      <p className="mt-1 text-xs font-medium text-zinc-700">
        {formatStayPeriod(stay.check_in, stay.check_out)} ·{" "}
        {labels.guestsShort(stay.num_adults, stay.num_children)}
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-600">
        {stay.room_names.length > 0 ? (
          <span className="rounded bg-zinc-100 px-1.5 py-0.5">
            {stay.room_names.join(", ")}
          </span>
        ) : (
          <span className="rounded bg-zinc-100 px-1.5 py-0.5">{labels.noRoom}</span>
        )}
        {isConfirmed && stay.total_price != null ? (
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-800">
            {stay.total_price} RON
          </span>
        ) : null}
        <span className="font-mono text-[10px] text-zinc-400">
          {formatBookingRef(stay.id)}
        </span>
      </div>
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
    <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:min-w-[132px]">
      <Link
        href={`/admin/bookings/${stay.id}`}
        className="admin-cereri-fill px-3 py-1.5 text-center text-xs font-bold"
      >
        {labels.details}
      </Link>
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
  items,
  query,
  loadError,
  labels,
}: {
  items: HistoryStay[];
  query: string;
  loadError: string | null;
  labels: CazariLabels;
}) {
  return (
    <RetroXpWindow
      title={
        query
          ? labels.historyFiltered(items.length)
          : labels.historyRecent(items.length)
      }
    >
      <div className="space-y-3">
        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          {query ? labels.historyFilteredHint : labels.historyRecentHint}
        </div>

        {loadError ? (
          <p className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {loadError}
          </p>
        ) : items.length === 0 ? (
          <AdminEmptyState
            emoji="🕘"
            title={query ? labels.historyEmptyFilter : labels.historyEmpty}
            description={
              query ? labels.tryOtherCriteria : labels.historyWillAppear
            }
          />
        ) : (
          <ul className="space-y-2">
            {items.map((stay) => (
              <li
                key={stay.id}
                className="rounded-md border border-zinc-200 bg-white px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-zinc-900">
                      {stay.guest_name}
                    </p>
                    <p className="truncate text-[11px] text-zinc-600">
                      {stay.room_names.join(", ") || labels.noRoom}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700">
                    {labels.checkout} {formatRoDate(stay.check_out)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-700">
                  {formatStayPeriod(stay.check_in, stay.check_out, true)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500">
                  <span>
                    {labels.guestsShort(stay.num_adults, stay.num_children)}
                  </span>
                  {stay.total_price != null ? (
                    <span>{stay.total_price} RON</span>
                  ) : null}
                  <span className="font-mono">{formatBookingRef(stay.id)}</span>
                </div>
                <Link
                  href={`/admin/bookings/${stay.id}`}
                  className="mt-2 inline-flex text-[11px] font-bold text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
                >
                  {labels.openBooking}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </RetroXpWindow>
  );
}

export default async function AdminCazariPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const tPages = await getTranslations("admin.pages.cazari");
  const tCommon = await getTranslations("admin.common");
  const tFlow = await getTranslations("booking.flowStatus");
  const params = await searchParams;
  const q = firstQueryValue(params.q).trim();

  const labels: CazariLabels = {
    noContact: tCommon("noContact"),
    noRoom: tPages("noRoomBadge"),
    statusConfirmed: tFlow("confirmata"),
    statusRequest: tFlow("cerere_noua"),
    details: tCommon("details"),
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
  };

  let stays: OperationalStay[] = [];
  let history: HistoryStay[] = [];
  let staysError: string | null = null;
  let historyError: string | null = null;

  const [staysResult, historyResult] = await Promise.allSettled([
    listOperationalStays(),
    listCompletedStayHistory(28),
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

  const filteredStays = q ? stays.filter((stay) => matchesStayQuery(stay, q)) : stays;
  const filteredHistory = q
    ? history.filter((stay) => matchesStayQuery(stay, q))
    : history;
  const cereri = filteredStays.filter((s) => s.status === "cerere_noua");
  const confirmate = filteredStays.filter((s) => s.status === "confirmata");

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
              <AdminStaySearchForm defaultQuery={q} />
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
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
              </div>
            </div>
          </RetroXpWindow>

          {staysError && <p className="mb-4 text-sm text-red-800">{staysError}</p>}

          <StayList
            title={`${tCommon("requests")} (${cereri.length})`}
            items={cereri}
            variant="cereri"
            returnTo="/admin/cazari"
            hasQuery={!!q}
            labels={labels}
          />

          <StayList
            title={tPages("confirmedTitle", { count: confirmate.length })}
            items={confirmate}
            variant="confirmate"
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
        </div>

        <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <StayHistoryPanel
            items={filteredHistory}
            query={q}
            loadError={historyError}
            labels={labels}
          />
        </aside>
      </div>
    </AdminRetroPageFrame>
  );
}
