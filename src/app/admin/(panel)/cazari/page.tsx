import Link from "next/link";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { formatBookingRef } from "@/lib/booking-admin-links";
import { BookingCancelButton } from "@/components/admin/BookingCancelButton";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import { listOperationalStays } from "@/services/bookings";
import { cancelBookingAction } from "../bookings/actions";

function StayList({
  title,
  items,
  variant,
  returnTo,
}: {
  title: string;
  items: Awaited<ReturnType<typeof listOperationalStays>>;
  variant: "cereri" | "confirmate";
  returnTo: string;
}) {
  const empty =
    variant === "confirmate"
      ? {
          emoji: "🛏",
          title: "Nicio cazare confirmată activă",
          description:
            "Când confirmi o cerere, cazarea apare aici cu camerele alocate.",
          href: "/admin/calendar",
          label: "Deschide calendarul",
        }
      : {
          emoji: "📬",
          title: "Nicio cerere în așteptare",
          description:
            "Cererile noi de pe site apar aici până le confirmi sau anulezi.",
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
              className="flex flex-wrap items-center justify-between gap-3 border border-zinc-200 bg-white px-4 py-3"
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
  return (
    <div className="min-w-0 flex-1">
      <p className="font-semibold">{stay.guest_name}</p>
      <p className="text-sm">
        {formatStayPeriod(stay.check_in, stay.check_out)} · {stay.num_adults} ad. +{" "}
        {stay.num_children} cop.
      </p>
      {stay.room_names.length > 0 && (
        <p className="text-xs text-zinc-600">Camere: {stay.room_names.join(", ")}</p>
      )}
      {isConfirmed && stay.total_price != null && (
        <p className="text-xs text-emerald-700">{stay.total_price} RON</p>
      )}
      <p className="text-xs text-zinc-400 font-mono">{formatBookingRef(stay.id)}</p>
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
    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:min-w-[140px]">
      <Link
        href={`/admin/bookings/${stay.id}`}
        className="admin-cereri-fill px-4 py-2 text-center text-sm font-medium"
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

export default async function AdminCazariPage() {
  let stays: Awaited<ReturnType<typeof listOperationalStays>> = [];
  let error: string | null = null;

  try {
    stays = await listOperationalStays();
  } catch (e) {
    error = e instanceof Error ? e.message : "Eroare";
  }

  const cereri = stays.filter((s) => s.status === "cerere_noua");
  const confirmate = stays.filter((s) => s.status === "confirmata");

  return (
    <AdminRetroPageFrame
      title="Cazări — Casa Emil"
      description="Cereri în așteptare și cazări confirmate. Anularea este disponibilă din listă, calendar sau detaliu rezervare."
    >
      {error && <p className="mb-4 text-sm text-red-800">{error}</p>}

      <StayList
        title={`Cereri neconfirmate (${cereri.length})`}
        items={cereri}
        variant="cereri"
        returnTo="/admin/cazari"
      />

      <StayList
        title={`Cazări confirmate (${confirmate.length})`}
        items={confirmate}
        variant="confirmate"
        returnTo="/admin/cazari"
      />
    </AdminRetroPageFrame>
  );
}
