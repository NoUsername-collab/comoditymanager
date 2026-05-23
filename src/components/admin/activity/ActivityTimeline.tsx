import Link from "next/link";
import {
  activityCalendarHref,
  formatBookingRef,
} from "@/lib/booking-admin-links";
import { activityActionLabel } from "@/domain/activity/labels";
import {
  activityIcon,
  activityTone,
  ACTIVITY_TONE_CLASS,
} from "@/domain/activity/presentation";
import type { ActivityLogEntry } from "@/domain/activity/types";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actorLabel(entry: ActivityLogEntry): string {
  if (entry.actor_email) return entry.actor_email;
  if (entry.action === "booking.request_created") return "Site public";
  return "Sistem";
}

export function ActivityTimeline({
  entries,
  compact = false,
  bookingCheckIn,
}: {
  entries: ActivityLogEntry[];
  compact?: boolean;
  /** Pentru evenimente fără date în metadata (ex. login vechi) */
  bookingCheckIn?: string | null;
}) {
  if (entries.length === 0) {
    return (
      <div className="admin-empty-state">
        <span className="admin-empty-state__icon" aria-hidden>
          📋
        </span>
        <p className="admin-empty-state__title">Niciun eveniment încă</p>
        <p className="admin-empty-state__text">
          După confirmări, mutări sau modificări în admin, acțiunile apar aici
          automat.
        </p>
      </div>
    );
  }

  return (
    <ul
      className={[
        "activity-timeline",
        compact && "activity-timeline--compact",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {entries.map((entry, index) => {
        const tone = activityTone(entry.action);
        const styles = ACTIVITY_TONE_CLASS[tone];
        const isLast = index === entries.length - 1;
        const calendarHref = activityCalendarHref(entry, bookingCheckIn);
        const bookingRef =
          entry.entity_type === "booking" && entry.entity_id
            ? formatBookingRef(entry.entity_id)
            : null;

        return (
          <li
            key={entry.id}
            className={[
              "activity-timeline__item",
              isLast && "activity-timeline__item--last",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="activity-timeline__rail" aria-hidden>
              <span
                className={[
                  "activity-timeline__dot ring-4",
                  styles.dot,
                ].join(" ")}
              />
            </div>

            <article className="activity-timeline__card">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={[
                    "activity-timeline__icon",
                    styles.icon,
                  ].join(" ")}
                  aria-hidden
                >
                  {activityIcon(entry.action)}
                </span>
                <span
                  className={[
                    "inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    styles.badge,
                  ].join(" ")}
                >
                  {activityActionLabel(entry.action)}
                </span>
                <time
                  className="ml-auto text-[11px] tabular-nums text-zinc-500"
                  dateTime={entry.created_at}
                >
                  {formatWhen(entry.created_at)}
                </time>
              </div>
              <p className="mt-2 text-sm font-semibold leading-snug text-zinc-900">
                {entry.summary}
                {bookingRef && (
                  <span className="ml-1.5 font-mono text-[10px] font-bold text-zinc-400">
                    {bookingRef}
                  </span>
                )}
              </p>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-zinc-500">
                <span>{actorLabel(entry)}</span>
                {entry.entity_type === "booking" && entry.entity_id && (
                  <span className="inline-flex flex-wrap items-center gap-x-1">
                    <span aria-hidden>·</span>
                    <Link
                      href={`/admin/bookings/${entry.entity_id}`}
                      className="font-semibold text-sky-700 hover:text-sky-900 hover:underline"
                    >
                      Vezi rezervarea →
                    </Link>
                    {calendarHref && (
                      <>
                        <span aria-hidden>·</span>
                        <Link
                          href={calendarHref}
                          className="font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                        >
                          Vezi în calendar →
                        </Link>
                      </>
                    )}
                  </span>
                )}
              </p>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
