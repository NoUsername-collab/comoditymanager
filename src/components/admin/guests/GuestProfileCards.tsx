"use client";

import type { GuestProfileRow } from "@/domain/guest/types";
import { useTranslations } from "next-intl";

export function GuestProfileCards({
  profile,
  showDetails = true,
}: {
  profile: GuestProfileRow | null;
  showDetails?: boolean;
}) {
  const tGuests = useTranslations("admin.guests");
  if (!profile) return null;

  return (
    <div className="guest-traits">
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
