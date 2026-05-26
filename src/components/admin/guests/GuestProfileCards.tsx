import type { GuestProfileRow } from "@/domain/guest/types";
import {
  GUEST_FLAG_LABELS,
  GUEST_NEGATIVE_TRAIT_LABELS,
  GUEST_POSITIVE_TRAIT_LABELS,
  guestLoyaltyLabel,
  guestTrustLabel,
} from "@/domain/guest/reputation";

function MetricCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  tone: "sky" | "emerald" | "violet";
}) {
  const toneClass =
    tone === "sky"
      ? "border-sky-200 bg-sky-50 text-sky-950"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-950"
        : "border-violet-200 bg-violet-50 text-violet-950";

  return (
    <div className={["rounded-md border px-4 py-3", toneClass].join(" ")}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-70">{title}</p>
      <p className="mt-2 text-3xl font-black leading-none">{value}</p>
      <p className="mt-1 text-xs font-medium opacity-80">{subtitle}</p>
    </div>
  );
}

function TraitLine({
  title,
  values,
  tone,
}: {
  title: string;
  values: string[];
  tone: "good" | "bad";
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{title}</p>
      <p
        className={[
          "mt-1 text-sm font-medium",
          tone === "good" ? "text-emerald-800" : "text-red-800",
        ].join(" ")}
      >
        {values.length > 0 ? values.join(" · ") : "—"}
      </p>
    </div>
  );
}

export function GuestProfileCards({ profile }: { profile: GuestProfileRow | null }) {
  if (!profile) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          title="Comportament"
          value={String(profile.trust_score)}
          subtitle={guestTrustLabel(profile.trust_score)}
          tone="sky"
        />
        <MetricCard
          title="Fidelitate"
          value={String(profile.loyalty_score)}
          subtitle={guestLoyaltyLabel(profile.loyalty_score)}
          tone="emerald"
        />
        <MetricCard
          title="Stele"
          value={profile.stars_avg.toFixed(1)}
          subtitle={`${profile.review_count} review${profile.review_count === 1 ? "" : "-uri"}`}
          tone="violet"
        />
      </div>

      <div className="grid gap-3 rounded-md border border-zinc-200 bg-white p-4 md:grid-cols-2">
        <div className="space-y-3">
          <TraitLine
            title="Traits bune active"
            values={profile.positive_traits.map((trait) => GUEST_POSITIVE_TRAIT_LABELS[trait])}
            tone="good"
          />
          <TraitLine
            title="Traits de atenție active"
            values={profile.negative_traits.map((trait) => GUEST_NEGATIVE_TRAIT_LABELS[trait])}
            tone="bad"
          />
        </div>

        <div className="space-y-2 text-sm">
          <p>
            <span className="font-bold">Flag curent:</span>{" "}
            <span
              className={
                profile.flag_level === "blacklist"
                  ? "text-red-900"
                  : profile.flag_level === "watchlist"
                    ? "text-amber-900"
                    : "text-zinc-700"
              }
            >
              {GUEST_FLAG_LABELS[profile.flag_level]}
            </span>
          </p>
          <p>
            <span className="font-bold">Sejururi încheiate:</span> {profile.completed_stays}
          </p>
          <p>
            <span className="font-bold">Nopți totale:</span> {profile.total_nights}
          </p>
          <p>
            <span className="font-bold">Ultimul checkout:</span>{" "}
            {profile.last_stay_check_out ?? "—"}
          </p>
          {profile.manual_note && (
            <p className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
              <span className="font-bold">Notă operator:</span> {profile.manual_note}
            </p>
          )}
          {profile.blacklist_reason && profile.flag_level === "blacklist" && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
              <span className="font-bold">Motiv blacklist:</span> {profile.blacklist_reason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
