"use client";

import { formatStayPeriod } from "@/lib/ro-calendar";
import { formatRoDate } from "@/lib/stay-dates";
import type { GuestAccessDenyReason, GuestAccessSchedule } from "@/domain/guest-app/types";
import { GuestAppShell } from "@/features/guest-app/GuestAppShell";
import type { GuestAppAppearance } from "@/domain/guest-app/types";

const ERROR_MESSAGES: Partial<Record<GuestAccessDenyReason, string>> = {
  disabled:
    "Aplicația pentru oaspeți este dezactivată. Contactați recepția.",
  setup_incomplete:
    "Aplicația nu este încă configurată pe acest mediu.",
  not_found: "Cod invalid sau inexistent.",
  wrong_host:
    "Linkul trebuie deschis de pe adresa pensiunii. Cere recepției linkul actualizat.",
  revoked: "Accesul a fost revocat.",
  booking_not_confirmed: "Rezervarea nu este confirmată.",
};

type Props = {
  pensionName: string;
  appearance?: GuestAppAppearance;
  reason: GuestAccessDenyReason;
  message?: string;
  schedule?: GuestAccessSchedule;
};

export function GuestAccessGate({
  pensionName,
  appearance = {},
  reason,
  message,
  schedule,
}: Props) {
  const isScheduled =
    reason === "before_check_in" || reason === "after_check_out";

  if (isScheduled && schedule) {
    const title =
      reason === "before_check_in"
        ? "Linkul se activează în curând"
        : "Șederea s-a încheiat";

    const body =
      reason === "before_check_in"
        ? `Aplicația devine disponibilă din ${formatRoDate(schedule.opensOn)} — cu o zi înainte de sosire.`
        : `Accesul a fost activ până pe ${formatRoDate(schedule.closesOn)}.`;

    return (
      <GuestAppShell appearance={appearance} pensionName={pensionName}>
        <div className="rounded-2xl border border-amber-500/35 bg-amber-950/30 p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/80">
            Guest app
          </p>
          <h1 className="mt-2 text-lg font-semibold text-amber-50">{title}</h1>
          <p className="mt-2 text-sm text-amber-100/90">{body}</p>
          <p className="mt-4 text-sm text-amber-100/75">
            Sejur: {formatStayPeriod(schedule.checkIn, schedule.checkOut, "ro", true)}
          </p>
          {reason === "before_check_in" ? (
            <p className="mt-3 text-xs text-amber-200/60">
              Reveniți după {formatRoDate(schedule.opensOn)} sau contactați recepția.
            </p>
          ) : null}
        </div>
      </GuestAppShell>
    );
  }

  const text =
    message ?? ERROR_MESSAGES[reason] ?? "Nu puteți accesa această pagină.";

  return (
    <GuestAppShell appearance={appearance} pensionName={pensionName}>
      <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-6 text-center">
        <h1 className="text-lg font-semibold text-red-100">Acces indisponibil</h1>
        <p className="mt-2 text-sm text-red-200/90">{text}</p>
      </div>
    </GuestAppShell>
  );
}
