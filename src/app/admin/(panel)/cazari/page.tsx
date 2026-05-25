import Link from "next/link";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { formatBookingRef } from "@/lib/booking-admin-links";
import { formatRoDate } from "@/lib/stay-dates";
import { AdminStaySearchForm } from "@/components/admin/AdminStaySearchForm";
import { BookingCancelButton } from "@/components/admin/BookingCancelButton";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import {
  listCompletedStayHistory,
  listOperationalStays,
} from "@/services/bookings";
import { cancelBookingAction } from "../bookings/actions";

type OperationalStay = Awaited<ReturnType<typeof listOperationalStays>>[number];
type HistoryStay = Awaited<ReturnType<typeof listCompletedStayHistory>>[number];

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

function countGuests(stay: OperationalStay | HistoryStay): string {
  return `${stay.num_adults} ad. + ${stay.num_children} cop.`;
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
}: {
  title: string;
  items: Awaited<ReturnType<typeof listOperationalStays>>;
  variant: "cereri" | "confirmate";
  returnTo: string;
  hasQuery: boolean;
}) {
  const empty =
    variant === "confirmate"
      ? {
          emoji: "🛏",
          title: hasQuery
            ? "Nicio cazare confirmată nu corespunde filtrului"
            : "Nicio cazare confirmată activă",
          description: hasQuery
            ? "Încearcă alt nume, email, telefon, cameră sau cod."
            : "Când confirmi o cerere, cazarea apare aici cu camerele alocate.",
          href: "/admin/calendar",
          label: "Deschide calendarul",
        }
      : {
          emoji: "📬",
          title: hasQuery
            ? "Nicio cerere nu corespunde filtrului"
            : "Nicio cerere în așteptare",
          description: hasQuery
            ? "Resetează filtrul sau caută după alt criteriu."
            : "Cererile noi de pe site apar aici până le confirmi sau anulezi.",
          href: "/admin/bookings",
          label: "Vezi cereri noi",
        };

  return (
    <RetroXpWindow title={title} className="mb-6">
      {items.length === 0 ? (
        <AdminEmptyState
          emoji={empty.emoji}
          title={empty.title}
          description={empty.description}
          actionHref={empty.href}
          actionLabel={empty.label}
        />
      ) : (
        <ul className="space-y-2">
          {items.map((stay) => (
            <li
              key={stay.id}
              className="grid gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <StayInfo stay={stay} />
              <StayActions stay={stay} returnTo={returnTo} />
            </li>
          ))}
        </ul>
      )}
    </RetroXpWindow>
  );
}

function StayInfo({
  stay,
}: {
  stay: Awaited<ReturnType<typeof listOperationalStays>>[number];
}) {
  const isConfirmed = stay.status === "confirmata";
  const statusClass = isConfirmed
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-zinc-900">{stay.guest_name}</p>
          <p className="truncate text-xs text-zinc-600">
            {[stay.guest_phone, stay.guest_email].filter(Boolean).join(" · ") || "Fără contact"}
          </p>
        </div>
        <span
          className={[
            "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            statusClass,
          ].join(" ")}
        >
          {isConfirmed ? "Confirmată" : "Cerere nouă"}
        </span>
      </div>

      <p className="mt-1 text-xs font-medium text-zinc-700">
        {formatStayPeriod(stay.check_in, stay.check_out)} · {countGuests(stay)}
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-600">
        {stay.room_names.length > 0 ? (
          <span className="rounded bg-zinc-100 px-1.5 py-0.5">
            {stay.room_names.join(", ")}
          </span>
        ) : (
          <span className="rounded bg-zinc-100 px-1.5 py-0.5">Fără cameră</span>
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
}: {
  stay: Awaited<ReturnType<typeof listOperationalStays>>[number];
  returnTo: string;
}) {
  const cancelMessage =
    stay.status === "confirmata"
      ? `Anulezi cazarea confirmată ${formatBookingRef(stay.id)} · ${stay.guest_name} · ${formatStayPeriod(stay.check_in, stay.check_out, true)}? Camerele devin din nou libere.`
      : `Anulezi cererea ${formatBookingRef(stay.id)} · ${stay.guest_name} · ${formatStayPeriod(stay.check_in, stay.check_out, true)}?`;

  return (
    <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:min-w-[132px]">
      <Link
        href={`/admin/bookings/${stay.id}`}
        className="admin-cereri-fill px-3 py-1.5 text-center text-xs font-bold"
      >
        Detalii
      </Link>
      <BookingCancelButton
        label={stay.status === "confirmata" ? "Anulează cazarea" : "Anulează cererea"}
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
}: {
  items: HistoryStay[];
  query: string;
  loadError: string | null;
}) {
  return (
    <RetroXpWindow
      title={query ? `Istoric filtrat (${items.length})` : `Istoric recent (${items.length})`}
    >
      <div className="space-y-3">
        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          {query
            ? "Rezultatele din istoric folosesc același filtru ca lista principală."
            : "Ultimele cazări încheiate, bune pentru recap rapid și reorientare în istoric."}
        </div>

        {loadError ? (
          <p className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {loadError}
          </p>
        ) : items.length === 0 ? (
          <AdminEmptyState
            emoji="🕘"
            title={query ? "Nimic în istoric pentru filtrul curent" : "Istoricul este gol"}
            description={
              query
                ? "Încearcă alt criteriu sau resetează căutarea."
                : "Cazări încheiate vor apărea aici pe măsură ce se adună."
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
                      {stay.room_names.join(", ") || "Fără cameră"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700">
                    Checkout {formatRoDate(stay.check_out)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-700">
                  {formatStayPeriod(stay.check_in, stay.check_out, true)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500">
                  <span>{countGuests(stay)}</span>
                  {stay.total_price != null ? <span>{stay.total_price} RON</span> : null}
                  <span className="font-mono">{formatBookingRef(stay.id)}</span>
                </div>
                <Link
                  href={`/admin/bookings/${stay.id}`}
                  className="mt-2 inline-flex text-[11px] font-bold text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
                >
                  Deschide rezervarea
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
  const params = await searchParams;
  const q = firstQueryValue(params.q).trim();

  let stays: Awaited<ReturnType<typeof listOperationalStays>> = [];
  let history: Awaited<ReturnType<typeof listCompletedStayHistory>> = [];
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
      staysResult.reason instanceof Error ? staysResult.reason.message : "Eroare";
  }

  if (historyResult.status === "fulfilled") {
    history = historyResult.value;
  } else {
    historyError =
      historyResult.reason instanceof Error
        ? historyResult.reason.message
        : "Nu s-a putut încărca istoricul.";
  }

  const filteredStays = q ? stays.filter((stay) => matchesStayQuery(stay, q)) : stays;
  const filteredHistory = q
    ? history.filter((stay) => matchesStayQuery(stay, q))
    : history;
  const cereri = filteredStays.filter((s) => s.status === "cerere_noua");
  const confirmate = filteredStays.filter((s) => s.status === "confirmata");
  const description = (
    <div className="space-y-1">
      <p className="max-w-3xl text-sm leading-relaxed">
        Hub operațional pentru cereri și cazări confirmate, plus istoric rapid în
        lateral ca să poți căuta și orienta instant.
      </p>
      <p className="text-xs text-zinc-500">
        Caută după nume, telefon, email, cameră sau codul rezervării.
      </p>
    </div>
  );

  return (
    <AdminRetroPageFrame
      title="Cazări — Casa Emil"
      description={description}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,30%)]">
        <div className="min-w-0">
          <RetroXpWindow title="Caută și filtrează" className="mb-6">
            <div className="space-y-3">
              <AdminStaySearchForm defaultQuery={q} />
              <p className="text-xs text-zinc-600">
                Exemple utile: nume client, `07...`, `gmail`, nume cameră sau codul
                rezervării.
              </p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <StayMetricChip
                  label={q ? "Rezultate" : "Operațional"}
                  value={filteredStays.length}
                  tone="sky"
                />
                <StayMetricChip label="Cereri" value={cereri.length} tone="amber" />
                <StayMetricChip
                  label="Confirmate"
                  value={confirmate.length}
                  tone="emerald"
                />
                <StayMetricChip
                  label="Istoric"
                  value={filteredHistory.length}
                  tone="zinc"
                />
              </div>
            </div>
          </RetroXpWindow>

          {staysError && <p className="mb-4 text-sm text-red-800">{staysError}</p>}

          <StayList
            title={`Cereri neconfirmate (${cereri.length})`}
            items={cereri}
            variant="cereri"
            returnTo="/admin/cazari"
            hasQuery={!!q}
          />

          <StayList
            title={`Cazări confirmate (${confirmate.length})`}
            items={confirmate}
            variant="confirmate"
            returnTo="/admin/cazari"
            hasQuery={!!q}
          />
        </div>

        <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <StayHistoryPanel items={filteredHistory} query={q} loadError={historyError} />
        </aside>
      </div>
    </AdminRetroPageFrame>
  );
}
