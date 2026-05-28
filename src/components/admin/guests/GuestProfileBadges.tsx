"use client";

import type {
  GuestBookingFlagSummary,
  GuestFlagLevel,
  GuestProfileRow,
} from "@/domain/guest/types";
import { useTranslations } from "next-intl";
import { GuestScoreHint } from "@/components/admin/guests/GuestScoreHint";
import { GuestStarsCompact } from "@/components/admin/guests/GuestStarsCompact";

type ProfileLike = GuestBookingFlagSummary | GuestProfileRow | null;

export function GuestProfileBadges({
  profile,
  alertLevel,
  alertNote,
  variant = "default",
}: {
  profile: ProfileLike;
  alertLevel?: GuestFlagLevel;
  alertNote?: string | null;
  variant?: "default" | "compact";
}) {
  const tGuests = useTranslations("admin.guests");

  const trustLabel = (score: number): string => {
    if (score >= 85) return tGuests("profileBadges.trustExcellent");
    if (score >= 70) return tGuests("profileBadges.trustVeryGood");
    if (score >= 55) return tGuests("profileBadges.trustOk");
    if (score >= 35) return tGuests("profileBadges.trustNeedsAttention");
    return tGuests("profileBadges.trustHighRisk");
  };

  const loyaltyLabel = (score: number): string => {
    if (score >= 85) return tGuests("profileBadges.loyaltyVeryLoyal");
    if (score >= 65) return tGuests("profileBadges.loyaltyLoyal");
    if (score >= 35) return tGuests("profileBadges.loyaltyReturnsOccasionally");
    if (score >= 15) return tGuests("profileBadges.loyaltyDeveloping");
    return tGuests("profileBadges.loyaltyNewOrRare");
  };

  if (!profile && (!alertLevel || alertLevel === "normal")) return null;

  const effectiveLevel =
    alertLevel && alertLevel !== "normal" ? alertLevel : profile?.flag_level ?? "normal";

  const riskTone =
    effectiveLevel === "blacklist"
      ? tGuests("profileBadges.blacklist")
      : effectiveLevel === "watchlist"
        ? tGuests("profileBadges.watchlist")
        : tGuests("profileBadges.normal");

  if (variant === "compact" && profile) {
    return (
      <div className="guest-badges guest-badges--compact">
        <span className="guest-badge-chip guest-badge-chip--sky">
          {tGuests("profileBadges.behavior")}{" "}
          <strong>{profile.trust_score}</strong>
          <GuestScoreHint kind="trust" />
        </span>
        <span className="guest-badge-chip guest-badge-chip--emerald">
          {tGuests("profileBadges.loyalty")}{" "}
          <strong>{profile.loyalty_score}</strong>
          <GuestScoreHint kind="loyalty" />
        </span>
        <span className="guest-badge-chip guest-badge-chip--neutral">
          {tGuests("profileBadges.rating")}{" "}
          <GuestStarsCompact
            value={profile.stars_avg}
            count={profile.review_count}
            size="sm"
            showCount={false}
            showValue
          />
          <GuestScoreHint kind="stars" />
        </span>
        <span
          className={[
            "guest-badge-chip",
            effectiveLevel === "normal"
              ? "guest-badge-chip--neutral"
              : "guest-badge-chip--amber",
          ].join(" ")}
        >
          {riskTone}
        </span>
        {alertNote ? (
          <span className="guest-badge-chip guest-badge-chip--alert">{alertNote}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="guest-badges">
      {profile && (
        <>
          <div className="guest-badge guest-badge--sky">
            <span className="guest-badge__label guest-badge__label-row">
              {tGuests("profileBadges.behavior")}
              <GuestScoreHint kind="trust" />
            </span>
            <span className="guest-badge__value">{profile.trust_score}</span>
            <span className="guest-badge__sub">{trustLabel(profile.trust_score)}</span>
          </div>
          <div className="guest-badge guest-badge--emerald">
            <span className="guest-badge__label guest-badge__label-row">
              {tGuests("profileBadges.loyalty")}
              <GuestScoreHint kind="loyalty" />
            </span>
            <span className="guest-badge__value">{profile.loyalty_score}</span>
            <span className="guest-badge__sub">{loyaltyLabel(profile.loyalty_score)}</span>
          </div>
          <div className="guest-badge guest-badge--neutral">
            <span className="guest-badge__label guest-badge__label-row">
              {tGuests("profileBadges.rating")}
              <GuestScoreHint kind="stars" />
            </span>
            <span className="guest-badge__value">
              <GuestStarsCompact
                value={profile.stars_avg}
                count={profile.review_count}
                size="md"
                showCount={false}
                showValue={false}
              />
            </span>
            <span className="guest-badge__sub">
              {profile.review_count > 0
                ? tGuests("profileBadges.reviewsCount", { count: profile.review_count })
                : tGuests("profileBadges.noReviewYet")}
            </span>
          </div>
          <div className={`guest-badge ${effectiveLevel === "normal" ? "guest-badge--neutral" : "guest-badge--amber"}`}>
            <span className="guest-badge__label">{tGuests("profileBadges.state")}</span>
            <span className="guest-badge__value">{riskTone}</span>
            <span className="guest-badge__sub">
              {effectiveLevel === "blacklist"
                ? profile.blacklist_reason || tGuests("profileBadges.criticalAlert")
                : effectiveLevel === "watchlist"
                  ? tGuests("profileBadges.watchCarefully")
                  : tGuests("profileBadges.noActiveAlert")}
            </span>
          </div>
        </>
      )}
      {alertNote && (
        <span className="guest-badges__alert">{alertNote}</span>
      )}
    </div>
  );
}
