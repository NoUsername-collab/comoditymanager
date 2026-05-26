import Link from "next/link";
import type { GuestListItem } from "@/domain/guest/types";
import { formatRoDate } from "@/lib/stay-dates";
import { GuestFlagPill } from "@/components/admin/guests/GuestFlagPill";
import { GuestStarsCompact } from "@/components/admin/guests/GuestStarsCompact";

export function GuestListCard({
  guest,
  previewHref,
  profileHref,
}: {
  guest: GuestListItem;
  previewHref: string;
  profileHref: string;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border border-zinc-200 bg-white px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-zinc-900">{guest.display_name}</p>
          <GuestFlagPill flagLevel={guest.profile?.flag_level} />
        </div>
        <p className="text-sm text-zinc-600">
          {[guest.email, guest.phone].filter(Boolean).join(" · ") || "Fără contact"}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <GuestStarsCompact
            value={guest.profile?.stars_avg ?? 0}
            count={guest.profile?.review_count ?? 0}
          />
          {guest.last_stay_check_out && (
            <span className="text-xs text-zinc-500">
              Ultimul checkout {formatRoDate(guest.last_stay_check_out)}
            </span>
          )}
          {(guest.profile?.completed_stays ?? guest.booking_count) > 0 && (
            <span className="text-xs text-zinc-500">
              {guest.profile?.completed_stays ?? guest.booking_count} sejur
              {(guest.profile?.completed_stays ?? guest.booking_count) === 1 ? "" : "uri"}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        <Link
          href={previewHref}
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Preview
        </Link>
        <Link
          href={profileHref}
          className="admin-cereri-fill px-4 py-2 text-sm font-medium"
        >
          Profil
        </Link>
      </div>
    </li>
  );
}
