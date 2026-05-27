"use client";

import type { GuestProfileRow } from "@/domain/guest/types";
import { useTranslations } from "next-intl";
import {
  GUEST_NEGATIVE_TRAITS,
  GUEST_POSITIVE_TRAITS,
} from "@/domain/guest/reputation";

function TraitLine({
  title,
  values,
  tone,
}: {
  title: string;
  values: string[];
  tone: "good" | "bad";
}) {
  const tGuests = useTranslations("admin.guests");
  const style =
    tone === "good"
      ? { color: "var(--status-confirmed-text)" }
      : { color: "var(--admin-danger-text)" };

  return (
    <div>
      <p
        className="text-xs font-bold uppercase tracking-wide"
        style={{ color: "var(--admin-text-muted)" }}
      >
        {title}
      </p>
      <p className="mt-1 text-sm font-medium" style={style}>
        {values.length > 0 ? values.join(" · ") : "—"}
      </p>
    </div>
  );
}

export function GuestProfileCards({ profile }: { profile: GuestProfileRow | null }) {
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
    <div className="space-y-4">
      <div
        className="grid gap-3 rounded-md border p-4 md:grid-cols-2"
        style={{
          borderColor: "var(--admin-panel-border)",
          background: "var(--admin-panel-bg)",
          color: "var(--admin-text)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <div className="space-y-3">
          <TraitLine
            title={tGuests("profileCards.activeGoodTraits")}
            values={profile.positive_traits.map((trait) => positiveLabels[trait])}
            tone="good"
          />
          <TraitLine
            title={tGuests("profileCards.attentionTraits")}
            values={profile.negative_traits.map((trait) => negativeLabels[trait])}
            tone="bad"
          />
        </div>

        <div className="space-y-2 text-sm">
          <p>
            <span className="font-bold">{tGuests("profileCards.currentState")}:</span>{" "}
            <span
              style={
                profile.flag_level === "blacklist"
                  ? { color: "var(--admin-danger-text)" }
                  : profile.flag_level === "watchlist"
                    ? { color: "var(--status-pending-text)" }
                    : { color: "var(--admin-text)" }
              }
            >
              {profile.flag_level === "blacklist"
                ? tGuests("profileBadges.blacklist")
                : profile.flag_level === "watchlist"
                  ? tGuests("profileBadges.watchlist")
                  : tGuests("profileBadges.normal")}
            </span>
          </p>
          <p>
            <span className="font-bold">{tGuests("profileCards.completedStays")}:</span> {profile.completed_stays}
          </p>
          <p>
            <span className="font-bold">{tGuests("profileCards.totalNights")}:</span> {profile.total_nights}
          </p>
          <p>
            <span className="font-bold">{tGuests("profileCards.lastCheckout")}:</span>{" "}
            {profile.last_stay_check_out ?? "—"}
          </p>
          {profile.manual_note && (
            <p
              className="rounded border px-3 py-2 text-xs"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-bg)",
                color: "var(--admin-text)",
              }}
            >
              <span className="font-bold">{tGuests("profileCards.operatorNote")}:</span> {profile.manual_note}
            </p>
          )}
          {profile.blacklist_reason && profile.flag_level === "blacklist" && (
            <p
              className="rounded border px-3 py-2 text-xs"
              style={{
                borderColor: "var(--admin-danger-border)",
                background: "var(--admin-danger-bg)",
                color: "var(--admin-danger-text)",
              }}
            >
              <span className="font-bold">{tGuests("blacklistReason")}:</span> {profile.blacklist_reason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
