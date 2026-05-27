import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
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
  const tGuests = useTranslations("admin.guests");
  const tCommon = useTranslations("admin.common");

  const staysCount = guest.profile?.completed_stays ?? guest.booking_count;

  return (
    <li className="guest-card group">
      <Link href={profileHref} className="guest-card__link">
        <div className="guest-card__top">
          <div className="guest-card__identity">
            <div className="guest-card__avatar">
              {(guest.display_name?.[0] ?? "?").toUpperCase()}
            </div>
            <div className="guest-card__name-block">
              <p className="guest-card__name">{guest.display_name}</p>
              <p className="guest-card__contact">
                {guest.email || guest.phone || tGuests("noEmail")}
              </p>
            </div>
          </div>
          <GuestFlagPill flagLevel={guest.profile?.flag_level} variant="edge" />
        </div>

        <div className="guest-card__stats">
          <GuestStarsCompact
            value={guest.profile?.stars_avg ?? DEFAULT_STARS_AVG}
            count={guest.profile?.review_count ?? 0}
            showCount={false}
            showValue={false}
          />
          <span className="guest-card__pill">
            {tGuests("trust")} {guest.profile?.trust_score ?? 0}
          </span>
          <span className="guest-card__pill">
            {tGuests("loyalShort")} {guest.profile?.loyalty_score ?? 0}
          </span>
        </div>

        <div className="guest-card__meta">
          {guest.last_stay_check_out && (
            <span>{tGuests("last")} {formatRoDate(guest.last_stay_check_out)}</span>
          )}
          {staysCount > 0 && (
            <span>{tGuests("staysCount", { count: staysCount })}</span>
          )}
        </div>
      </Link>

      <div className="guest-card__actions">
        <Link
          href={previewHref}
          aria-label={tGuests("previewAria", { name: guest.display_name })}
          title={tCommon("preview")}
          className="guest-card__btn guest-card__btn--secondary"
        >
          {tCommon("preview")}
        </Link>
        <Link
          href={profileHref}
          className="guest-card__btn guest-card__btn--primary"
        >
          {tCommon("profile")}
        </Link>
      </div>
    </li>
  );
}
