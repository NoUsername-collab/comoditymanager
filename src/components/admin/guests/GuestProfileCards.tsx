"use client";

import type { GuestProfileRow } from "@/domain/guest/types";
import { useTranslations } from "next-intl";
import {
  GUEST_NEGATIVE_TRAITS,
  GUEST_POSITIVE_TRAITS,
} from "@/domain/guest/reputation";

export function GuestProfileCards({
  profile,
  showDetails = true,
}: {
  profile: GuestProfileRow | null;
  showDetails?: boolean;
}) {
  const tGuests = useTranslations("admin.guests");
  if (!profile) return null;

  const positiveLabels: Record<string, string> = Object.fromEntries(
    GUEST_POSITIVE_TRAITS.map((trait) => [
      trait,
      tGuests(`traits.positive.${trait}` as never),
    ])
  );
  const negativeLabels: Record<string, string> = Object.fromEntries(
    GUEST_NEGATIVE_TRAITS.map((trait) => [
      trait,
      tGuests(`traits.negative.${trait}` as never),
    ])
  );

  return (
    <div className="guest-traits">
      <div className="guest-traits__section">
        <p className="guest-traits__title">{tGuests("profileCards.activeGoodTraits")}</p>
        <div className="guest-traits__tags">
          {profile.positive_traits.length > 0
            ? profile.positive_traits.map((trait) => (
                <span key={trait} className="guest-traits__tag guest-traits__tag--good">
                  {positiveLabels[trait]}
                </span>
              ))
            : <span className="guest-traits__empty">—</span>}
        </div>
      </div>

      <div className="guest-traits__section">
        <p className="guest-traits__title">{tGuests("profileCards.attentionTraits")}</p>
        <div className="guest-traits__tags">
          {profile.negative_traits.length > 0
            ? profile.negative_traits.map((trait) => (
                <span key={trait} className="guest-traits__tag guest-traits__tag--bad">
                  {negativeLabels[trait]}
                </span>
              ))
            : <span className="guest-traits__empty">—</span>}
        </div>
      </div>

      {showDetails && (
        <div className="guest-traits__details">
          <div className="guest-traits__detail">
            <span className="guest-traits__detail-label">{tGuests("profileCards.currentState")}</span>
            <span
              className={
                profile.flag_level === "blacklist"
                  ? "guest-traits__detail-value--danger"
                  : profile.flag_level === "watchlist"
                    ? "guest-traits__detail-value--warn"
                    : "guest-traits__detail-value"
              }
            >
              {profile.flag_level === "blacklist"
                ? tGuests("profileBadges.blacklist")
                : profile.flag_level === "watchlist"
                  ? tGuests("profileBadges.watchlist")
                  : tGuests("profileBadges.normal")}
            </span>
          </div>
          <div className="guest-traits__detail">
            <span className="guest-traits__detail-label">{tGuests("profileCards.totalNights")}</span>
            <span className="guest-traits__detail-value">{profile.total_nights}</span>
          </div>
          <div className="guest-traits__detail">
            <span className="guest-traits__detail-label">{tGuests("profileCards.lastCheckout")}</span>
            <span className="guest-traits__detail-value">{profile.last_stay_check_out ?? "—"}</span>
          </div>
        </div>
      )}

      {profile.manual_note && (
        <div className="guest-traits__note">
          <span className="guest-traits__note-label">{tGuests("profileCards.operatorNote")}</span>
          <p>{profile.manual_note}</p>
        </div>
      )}

      {profile.blacklist_reason && profile.flag_level === "blacklist" && (
        <div className="guest-traits__note guest-traits__note--danger">
          <span className="guest-traits__note-label">{tGuests("blacklistReason")}</span>
          <p>{profile.blacklist_reason}</p>
        </div>
      )}
    </div>
  );
}
