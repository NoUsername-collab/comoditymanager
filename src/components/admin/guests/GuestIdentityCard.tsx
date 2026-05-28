import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { GuestRow } from "@/domain/guest/types";
import { DEFAULT_STARS_AVG } from "@/domain/guest/reputation";
import { GuestFlagPill } from "@/components/admin/guests/GuestFlagPill";
import { GuestIdentityStatusPill } from "@/components/admin/guests/GuestIdentityForm";
import { GuestStarsCompact } from "@/components/admin/guests/GuestStarsCompact";
import { formatRoDate } from "@/lib/stay-dates";

export function GuestIdentityCard({
  guest,
  footer,
}: {
  guest: GuestRow;
  footer?: ReactNode;
}) {
  const tGuests = useTranslations("admin.guests");
  const tCommon = useTranslations("admin.common");

  const trust = guest.profile?.trust_score ?? 0;
  const loyalty = guest.profile?.loyalty_score ?? 0;
  const stars = guest.profile?.stars_avg ?? DEFAULT_STARS_AVG;
  const reviewCount = guest.profile?.review_count ?? 0;
  const stays = guest.profile?.completed_stays ?? 0;

  return (
    <section className="guest-hero">
      <div className="guest-hero__top">
        <div className="guest-hero__avatar">
          {(guest.display_name?.[0] ?? "?").toUpperCase()}
        </div>
        <div className="guest-hero__info">
          <div className="guest-hero__name-row">
            <h2 className="guest-hero__name">{guest.display_name}</h2>
            <GuestFlagPill flagLevel={guest.profile?.flag_level} />
            <GuestIdentityStatusPill status={guest.identity_status} />
          </div>
          <p className="guest-hero__contact">
            {[guest.email, guest.phone].filter(Boolean).join(" · ") || tGuests("noEmail")}
          </p>
          <p className="guest-hero__since">
            {tGuests("clientSince")} {formatRoDate(guest.created_at.slice(0, 10))}
            {" · "}
            {tGuests("clientIdShort")}{" "}
            <span className="font-mono text-[10px] opacity-60">{guest.id.slice(0, 8)}</span>
          </p>
        </div>
      </div>

      <div className="guest-hero__stats">
        <div className="guest-hero__stat guest-hero__stat--trust">
          <span className="guest-hero__stat-value">{trust}</span>
          <span className="guest-hero__stat-label">{tGuests("trust")}</span>
        </div>
        <div className="guest-hero__stat guest-hero__stat--loyalty">
          <span className="guest-hero__stat-value">{loyalty}</span>
          <span className="guest-hero__stat-label">{tGuests("loyalShort")}</span>
        </div>
        <div className="guest-hero__stat guest-hero__stat--stars">
          <span className="guest-hero__stat-value">
            <GuestStarsCompact value={stars} count={reviewCount} showCount={false} showValue={false} />
          </span>
          <span className="guest-hero__stat-label">
            {tGuests("stars.outOfFive", { value: stars.toFixed(1) })}
          </span>
        </div>
        <div className="guest-hero__stat">
          <span className="guest-hero__stat-value">{stays}</span>
          <span className="guest-hero__stat-label">{tGuests("profileCards.completedStays")}</span>
        </div>
      </div>

      {footer ? <div className="guest-hero__footer">{footer}</div> : null}
    </section>
  );
}
