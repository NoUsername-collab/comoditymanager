"use client";

import { ActivityUndoButton } from "@/features/activity/ui/ActivityUndoButton";
import { AdminTextActionLink } from "@/components/admin/ui/AdminTextAction";
import { useLocale, useTranslations } from "next-intl";
import {
  activityCalendarHref,
  formatBookingRef,
} from "@/lib/booking-admin-links";
import { activityMessageKey } from "@/lib/i18n-activity";
import {
  activityIcon,
  activityTone,
  ACTIVITY_TONE_CLASS,
} from "@/domain/activity/presentation";
import {
  canUndoActivityEntry,
  isUndoneEntry,
} from "@/domain/activity/undo/registry";
import type { ActivityLogEntry } from "@/domain/activity/types";

function formatWhen(iso: string, locale: string): string {
  const tag = locale === "ro" ? "ro-RO" : locale === "bg" ? "bg-BG" : "en-GB";
  return new Date(iso).toLocaleString(tag, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  const locale = useLocale();
  const t = useTranslations("admin.activity");

  function actorLabel(entry: ActivityLogEntry): string {
    if (entry.actor_email) return entry.actor_email;
    if (entry.action === "booking.request_created") return t("actorPublicSite");
    return t("actorSystem");
  }

  if (entries.length === 0) {
    return (
      <div className="admin-empty-state">
        <span className="admin-empty-state__icon" aria-hidden>
          📋
        </span>
        <p className="admin-empty-state__title">{t("emptyTitle")}</p>
        <p className="admin-empty-state__text">{t("emptyText")}</p>
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
        const showUndo = canUndoActivityEntry(entry);
        const wasUndone = isUndoneEntry(entry);

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
                  {t(activityMessageKey(entry.action))}
                </span>
                <time
                  className="ml-auto text-[11px] tabular-nums text-zinc-500"
                  dateTime={entry.created_at}
                >
                  {formatWhen(entry.created_at, locale)}
                </time>
                {showUndo && (
                  <ActivityUndoButton logId={entry.id} compact />
                )}
                {wasUndone && (
                  <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    {t("undoneBadge")}
                  </span>
                )}
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
                {entry.action === "booking.checkout.set" &&
                  entry.metadata?.early_departure === true && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="admin-text--danger">
                        {Number(entry.metadata?.early_checkout_fee) > 0
                          ? t("checkoutEarlyDetailFee", {
                              fee: String(entry.metadata?.early_checkout_fee),
                            })
                          : t("checkoutEarlyDetail")}
                      </span>
                    </>
                  )}
                {entry.action === "booking.checkout.set" &&
                  entry.metadata?.late_departure === true &&
                  entry.metadata?.early_departure !== true && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="admin-text--warning">{t("checkoutLateDetail")}</span>
                    </>
                  )}
                {entry.entity_type === "booking" && entry.entity_id && (
                  <span className="inline-flex flex-wrap items-center gap-x-1">
                    <span aria-hidden>·</span>
                    <AdminTextActionLink
                      href={`/admin/bookings/${entry.entity_id}`}
                      variant="accent"
                      className="text-xs"
                    >
                      {t("viewBooking")} →
                    </AdminTextActionLink>
                    {calendarHref && (
                      <>
                        <span aria-hidden>·</span>
                        <AdminTextActionLink
                          href={calendarHref}
                          variant="primary"
                          className="text-xs"
                        >
                          {t("viewCalendar")} →
                        </AdminTextActionLink>
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
