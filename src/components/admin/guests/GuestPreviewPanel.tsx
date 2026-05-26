"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GuestRow } from "@/domain/guest/types";
import { GuestBlacklistPanel } from "@/components/admin/guests/GuestBlacklistPanel";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import { GuestFlagPill } from "@/components/admin/guests/GuestFlagPill";
import { GuestRebookButtons } from "@/components/admin/guests/GuestRebookButtons";
import { GuestStarsCompact } from "@/components/admin/guests/GuestStarsCompact";
import { formatRoDate } from "@/lib/stay-dates";

export function GuestPreviewPanel({
  guest,
  closeHref,
  profileHref,
}: {
  guest: GuestRow | null;
  closeHref: string;
  profileHref: string;
}) {
  const router = useRouter();
  if (!guest) return null;
  const canRebook = (guest.profile?.completed_stays ?? 0) > 0;

  return (
    <AdminFloatingPanel
      open
      onClose={() => router.replace(closeHref)}
      title={`Preview client — ${guest.display_name}`}
      variant="modal"
      width={720}
    >
      <div className="space-y-4 p-1">
        <section className="rounded-xl border border-zinc-200 bg-white px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-bold text-zinc-900">{guest.display_name}</p>
            <GuestFlagPill flagLevel={guest.profile?.flag_level} />
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            {[guest.email, guest.phone].filter(Boolean).join(" · ") || "Fără contact"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <GuestStarsCompact
              value={guest.profile?.stars_avg ?? 0}
              count={guest.profile?.review_count ?? 0}
              size="md"
            />
            <span className="text-sm text-zinc-600">
              {guest.profile?.completed_stays ?? 0} sejur
              {(guest.profile?.completed_stays ?? 0) === 1 ? "" : "uri"} încheiate
            </span>
            {guest.profile?.last_stay_check_out && (
              <span className="text-sm text-zinc-600">
                Ultimul checkout {formatRoDate(guest.profile.last_stay_check_out)}
              </span>
            )}
          </div>
        </section>

        {(guest.profile?.blacklist_reason || guest.profile?.manual_note) && (
          <section className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-700">
            {guest.profile?.blacklist_reason && guest.profile.flag_level === "blacklist" ? (
              <p>
                <span className="font-bold">Motiv blacklist:</span>{" "}
                {guest.profile.blacklist_reason}
              </p>
            ) : null}
            {guest.profile?.manual_note ? (
              <p className={guest.profile?.blacklist_reason ? "mt-2" : ""}>
                <span className="font-bold">Notă internă:</span> {guest.profile.manual_note}
              </p>
            ) : null}
          </section>
        )}

        {guest.notes && (
          <section className="rounded-xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-700">
            <p className="font-bold">Note generale</p>
            <p className="mt-1 whitespace-pre-wrap">{guest.notes}</p>
          </section>
        )}

        <GuestBlacklistPanel guestId={guest.id} profile={guest.profile} compact />

        <section className="rounded-xl border border-zinc-200 bg-white px-4 py-4">
          <p className="text-sm font-bold text-zinc-900">Acțiuni rapide</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={profileHref} className="admin-cereri-fill px-4 py-2 text-sm font-medium">
              Deschide profil complet
            </Link>
          </div>
          <div className="mt-4">
            <GuestRebookButtons guestId={guest.id} disabled={!canRebook} />
            {!canRebook && (
              <p className="mt-2 text-xs text-zinc-500">
                Rebook devine disponibil după primul sejur încheiat.
              </p>
            )}
          </div>
        </section>
      </div>
    </AdminFloatingPanel>
  );
}
