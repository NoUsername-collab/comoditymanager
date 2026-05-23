import Link from "next/link";
import { formatRoDate } from "@/lib/stay-dates";

export type StayInfo = {
  booking_id: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  status: "confirmata" | "cerere_noua";
  num_adults: number;
  num_children: number;
};

export function StayBlock({
  title,
  stay,
  empty,
  muted,
}: {
  title: string;
  stay: StayInfo | null;
  empty: string;
  muted?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border px-4 py-3",
        muted ? "border-zinc-100 bg-zinc-50/50" : "border-zinc-200/80 bg-white",
      ].join(" ")}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {title}
      </p>
      {!stay ? (
        <p className="mt-1.5 text-sm text-zinc-500">{empty}</p>
      ) : (
        <div className="mt-2">
          <p className="font-semibold text-zinc-900">{stay.guest_name}</p>
          <p className="text-sm text-zinc-600">
            {formatRoDate(stay.check_in)} → {formatRoDate(stay.check_out)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {stay.num_adults} ad. + {stay.num_children} cop.
          </p>
          <span
            className={[
              "mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
              stay.status === "confirmata"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-900",
            ].join(" ")}
          >
            {stay.status === "confirmata" ? "Confirmată" : "Cerere nouă"}
          </span>
          <Link
            href={`/admin/bookings/${stay.booking_id}`}
            className="mt-2 block text-xs font-medium text-zinc-600 underline hover:text-zinc-900"
          >
            Vezi rezervarea →
          </Link>
        </div>
      )}
    </div>
  );
}
