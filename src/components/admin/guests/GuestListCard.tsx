import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { GuestListItem } from "@/domain/guest/types";
import { DEFAULT_STARS_AVG } from "@/domain/guest/reputation";
import { formatRoDate } from "@/lib/stay-dates";
import { GuestFlagPill } from "@/components/admin/guests/GuestFlagPill";
import { GuestIdentityStatusPill } from "@/components/admin/guests/GuestIdentityForm";
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
  const tGuests = useTranslations("admin.guests");

  const staysCount = guest.profile?.completed_stays ?? guest.booking_count;
  const contact = guest.email || guest.phone || null;

  return (
    <li className="guest-card">
      <Link href={profileHref} className="guest-card__link">
        <div className="guest-card__avatar">
          {(guest.display_name?.[0] ?? "?").toUpperCase()}
        </div>

        <div className="guest-card__info">
          <div className="guest-card__top">
            <span className="guest-card__name">{guest.display_name}</span>
            <div className="guest-card__badges">
              <GuestFlagPill flagLevel={guest.profile?.flag_level} variant="edge" />
              <GuestIdentityStatusPill status={guest.identity_status} compact />
            </div>
          </div>

          <div className="guest-card__meta">
            {contact && <span className="guest-card__contact">{contact}</span>}
            {contact && (staysCount > 0 || guest.profile?.stars_avg) && (
              <span className="guest-card__sep">·</span>
            )}
            <GuestStarsCompact
              value={guest.profile?.stars_avg ?? DEFAULT_STARS_AVG}
              count={guest.profile?.review_count ?? 0}
              showCount
              showValue
            />
            {staysCount > 0 && (
              <>
                <span className="guest-card__sep">·</span>
                <span>{tGuests("staysCount", { count: staysCount })}</span>
              </>
            )}
            {guest.last_stay_check_out && (
              <>
                <span className="guest-card__sep">·</span>
                <span>{formatRoDate(guest.last_stay_check_out)}</span>
              </>
            )}
          </div>
        </div>
      </Link>

      <Link
        href={previewHref}
        aria-label={tGuests("previewAria", { name: guest.display_name })}
        className="guest-card__preview-btn"
      >
        ↗
      </Link>
    </li>
  );
}
