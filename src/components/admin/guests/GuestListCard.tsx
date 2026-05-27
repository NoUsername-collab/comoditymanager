import Link from "next/link";
import type { GuestListItem } from "@/domain/guest/types";
import { DEFAULT_STARS_AVG } from "@/domain/guest/reputation";
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
    <li
      className="relative h-full w-full max-w-[240px] overflow-hidden rounded-[9px] border px-2.5 py-2.5"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div className="absolute right-0 top-0">
        <GuestFlagPill flagLevel={guest.profile?.flag_level} variant="edge" />
      </div>

      <div className="min-w-0 pr-14">
        <p className="truncate text-[13px] font-black leading-tight" style={{ color: "var(--text)" }}>
          {guest.display_name}
        </p>
        <p className="mt-0.5 truncate text-[10px] leading-tight" style={{ color: "var(--text-muted)" }}>
          {guest.email || "Fără email"}
        </p>
        <p className="truncate text-[10px] leading-tight" style={{ color: "var(--text-faint)" }}>
          {guest.phone || "Fără telefon"}
        </p>
      </div>

      <div className="mt-2 space-y-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          <GuestStarsCompact
            value={guest.profile?.stars_avg ?? DEFAULT_STARS_AVG}
            count={guest.profile?.review_count ?? 0}
            showCount={false}
            showValue={false}
          />
          <span
            className="rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]"
            style={{
              borderColor: "var(--accent)",
              background: "var(--accent-muted)",
              color: "var(--accent)",
            }}
          >
            Trust {guest.profile?.trust_score ?? 0}
          </span>
          <span
            className="rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]"
            style={{
              borderColor: "var(--accent)",
              background: "var(--accent-muted)",
              color: "var(--accent)",
            }}
          >
            Fid. {guest.profile?.loyalty_score ?? 0}
          </span>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {guest.last_stay_check_out && (
            <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>
              Ultimul {formatRoDate(guest.last_stay_check_out)}
            </span>
          )}
          {(guest.profile?.completed_stays ?? guest.booking_count) > 0 && (
            <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>
              {guest.profile?.completed_stays ?? guest.booking_count} sejur
              {(guest.profile?.completed_stays ?? guest.booking_count) === 1 ? "" : "uri"}
            </span>
          )}
        </div>

        <div className="grid grid-cols-[40px_1fr] gap-1.5">
          <Link
            href={previewHref}
            aria-label={`Preview ${guest.display_name}`}
            title="Preview"
            className="rounded px-0 py-1 text-center text-[10px] font-semibold transition"
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              color: "var(--text)",
            }}
          >
            ↗
          </Link>
          <Link
            href={profileHref}
            className="rounded px-2 py-1 text-center text-[10px] font-bold uppercase tracking-[0.08em] transition"
            style={{
              border: "1px solid var(--text)",
              background: "var(--text)",
              color: "var(--surface)",
            }}
          >
            Profil
          </Link>
        </div>
      </div>
    </li>
  );
}
