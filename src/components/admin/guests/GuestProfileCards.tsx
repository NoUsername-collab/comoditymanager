import type { GuestProfileRow } from "@/domain/guest/types";
import {
  GUEST_FLAG_LABELS,
  GUEST_NEGATIVE_TRAIT_LABELS,
  GUEST_POSITIVE_TRAIT_LABELS,
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
  if (!profile) return null;

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
            title="Trăsături bune active"
            values={profile.positive_traits.map((trait) => GUEST_POSITIVE_TRAIT_LABELS[trait])}
            tone="good"
          />
          <TraitLine
            title="Trăsături de atenție"
            values={profile.negative_traits.map((trait) => GUEST_NEGATIVE_TRAIT_LABELS[trait])}
            tone="bad"
          />
        </div>

        <div className="space-y-2 text-sm">
          <p>
            <span className="font-bold">Stare curentă:</span>{" "}
            <span
              style={
                profile.flag_level === "blacklist"
                  ? { color: "var(--admin-danger-text)" }
                  : profile.flag_level === "watchlist"
                    ? { color: "var(--status-pending-text)" }
                    : { color: "var(--admin-text)" }
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
            <p
              className="rounded border px-3 py-2 text-xs"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-bg)",
                color: "var(--admin-text)",
              }}
            >
              <span className="font-bold">Notă operator:</span> {profile.manual_note}
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
              <span className="font-bold">Motiv blacklist:</span> {profile.blacklist_reason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
