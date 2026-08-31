"use client";

import type {
  GuestBookingFlagSummary,
  GuestFlagLevel,
  GuestProfileRow,
} from "@/domain/guest/types";
import { useTranslations } from "next-intl";
import { GuestScoreHint } from "@/features/guests/ui/GuestScoreHint";
import { GuestStarsCompact } from "@/features/guests/ui/GuestStarsCompact";

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
  variant?: "default" | "compact" | "cerere";
}) {
  const tGuests = useTranslations("admin.guests");

  if (!profile && (!alertLevel || alertLevel === "normal")) return null;

  const effectiveLevel =
    alertLevel && alertLevel !== "normal" ? alertLevel : profile?.flag_level ?? "normal";

  const riskTone =
    effectiveLevel === "blacklist"
      ? tGuests("profileBadges.blacklist")
      : effectiveLevel === "watchlist"
        ? tGuests("profileBadges.watchlist")
        : tGuests("profileBadges.normal");

  if (variant === "cerere" && profile) {
    return (
      <div className="guest-badges guest-badges--cerere">
        <span className="guest-badges--cerere__stat guest-badges--cerere__stat--neutral">
          <span className="guest-badges--cerere__label">
            {tGuests("profileBadges.rating")}
          </span>
          <GuestStarsCompact
            value={profile.stars_avg}
            count={profile.review_count}
            size="sm"
            showCount={false}
            showValue
          />
        </span>
        <span
          className={[
            "guest-badges--cerere__stat",
            effectiveLevel === "normal"
              ? "guest-badges--cerere__stat--neutral"
              : "guest-badges--cerere__stat--amber",
          ].join(" ")}
        >
          <span className="guest-badges--cerere__label">
            {tGuests("profileBadges.state")}
          </span>
          <strong>{riskTone}</strong>
        </span>
        {alertNote ? (
          <p className="guest-badges--cerere__alert">{alertNote}</p>
        ) : null}
      </div>
    );
  }

  if (variant === "cerere" && alertNote) {
    return <p className="guest-badges--cerere__alert">{alertNote}</p>;
  }

  if (variant === "compact" && profile) {
    return (
      <div className="guest-badges guest-badges--compact">
        <span className="guest-badge-chip guest-badge-chip--neutral">
          {tGuests("profileBadges.rating")}{" "}
          <GuestStarsCompact
            value={profile.stars_avg}
            count={profile.review_count}
            size="sm"
            showCount={false}
            showValue
          />
          <GuestScoreHint />
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
          <div className="guest-badge guest-badge--neutral">
            <span className="guest-badge__label guest-badge__label-row">
              {tGuests("profileBadges.rating")}
              <GuestScoreHint />
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
