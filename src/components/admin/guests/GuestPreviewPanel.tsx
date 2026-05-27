"use client";

import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { GuestRow } from "@/domain/guest/types";
import { DEFAULT_STARS_AVG } from "@/domain/guest/reputation";
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
  const tGuests = useTranslations("admin.guests");
  const tCommon = useTranslations("admin.common");
  const router = useRouter();
  if (!guest) return null;
  const canRebook = (guest.profile?.completed_stays ?? 0) > 0;
  const panelStyle = {
    borderColor: "var(--admin-panel-border)",
    background: "var(--admin-panel-bg)",
    color: "var(--admin-text)",
    boxShadow: "var(--card-shadow)",
  } as const;
  const softPanelStyle = {
    borderColor: "var(--color-border)",
    background: "var(--color-bg)",
    color: "var(--admin-text)",
  } as const;
  const titleStyle = { color: "var(--admin-text)" } as const;
  const mutedStyle = { color: "var(--admin-text-muted)" } as const;
  const subtleTextStyle = { color: "var(--color-text-muted)" } as const;
  const primaryButtonStyle = {
    border: "1px solid var(--admin-btn-primary-bg)",
    background: "var(--admin-btn-primary-bg)",
    color: "var(--admin-btn-primary-text)",
  } as const;

  return (
    <AdminFloatingPanel
      open
      onClose={() => router.replace(closeHref)}
      title={tGuests("previewTitle", { name: guest.display_name })}
      variant="modal"
      width={720}
    >
      <div className="space-y-4 p-1">
        <section className="rounded-xl border px-4 py-4" style={panelStyle}>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-bold" style={titleStyle}>
              {guest.display_name}
            </p>
            <GuestFlagPill flagLevel={guest.profile?.flag_level} />
          </div>
          <p className="mt-1 text-sm" style={mutedStyle}>
            {[guest.email, guest.phone].filter(Boolean).join(" · ") || tCommon("noContact")}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <GuestStarsCompact
              value={guest.profile?.stars_avg ?? DEFAULT_STARS_AVG}
              count={guest.profile?.review_count ?? 0}
              size="md"
              showCount={false}
              showValue={false}
            />
            <span className="text-sm" style={mutedStyle}>
              {tGuests("completedStaysCount", { count: guest.profile?.completed_stays ?? 0 })}
            </span>
            {guest.profile?.last_stay_check_out && (
              <span className="text-sm" style={mutedStyle}>
                {tGuests("lastCheckout")} {formatRoDate(guest.profile.last_stay_check_out)}
              </span>
            )}
          </div>
        </section>

        {(guest.profile?.blacklist_reason || guest.profile?.manual_note) && (
          <section className="rounded-xl border px-4 py-4 text-sm" style={softPanelStyle}>
            {guest.profile?.blacklist_reason && guest.profile.flag_level === "blacklist" ? (
              <p>
                <span className="font-bold">{tGuests("blacklistReason")}:</span>{" "}
                {guest.profile.blacklist_reason}
              </p>
            ) : null}
            {guest.profile?.manual_note ? (
              <p className={guest.profile?.blacklist_reason ? "mt-2" : ""}>
                <span className="font-bold">{tGuests("internalNote")}:</span> {guest.profile.manual_note}
              </p>
            ) : null}
          </section>
        )}

        {guest.notes && (
          <section className="rounded-xl border px-4 py-4 text-sm" style={panelStyle}>
            <p className="font-bold" style={titleStyle}>
              {tGuests("generalNotes")}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{guest.notes}</p>
          </section>
        )}

        <GuestBlacklistPanel
          key={`preview-blacklist-${guest.id}-${guest.profile?.updated_at ?? "none"}-${guest.profile?.flag_level ?? "normal"}`}
          guestId={guest.id}
          profile={guest.profile}
          compact
        />

        <section className="rounded-xl border px-4 py-4" style={panelStyle}>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={subtleTextStyle}>
            {tCommon("quickActions")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={profileHref}
              className="rounded px-4 py-2 text-sm font-medium transition"
              style={primaryButtonStyle}
            >
              {tGuests("openFullProfile")}
            </Link>
          </div>
          <div className="mt-4">
            <GuestRebookButtons guestId={guest.id} disabled={!canRebook} />
            {!canRebook && (
              <p className="mt-2 text-xs" style={subtleTextStyle}>
                {tGuests("rebookAfterFirstStay")}
              </p>
            )}
          </div>
        </section>
      </div>
    </AdminFloatingPanel>
  );
}
