"use client";

import { useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { GanttCheckTimeDialog } from "@/components/admin/gantt/GanttCheckTimeDialog";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { formatGuestPartyDetail } from "@/lib/guest-party";
import { formatStayPeriod } from "@/lib/ro-calendar";
import type { CheckInQuestItem } from "@/services/today-board";

const QUEST_PREVIEW_LIMIT = 3;

type Props = {
  todayIso: string;
  checkInTime: string;
  pending: CheckInQuestItem[];
  completedCount: number;
};

function matchesQuestSearch(item: CheckInQuestItem, query: string): boolean {
  const haystack = [
    item.guestLabel,
    item.guestName,
    ...item.roomNames,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function CheckInMilestoneBoard({
  checkInTime,
  pending,
  completedCount,
}: Props) {
  const t = useTranslations("admin.dashboard.checkInQuest");
  const locale = useLocale();
  const router = useRouter();
  const { showToast } = useAdminFx();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<CheckInQuestItem | null>(null);
  const [query, setQuery] = useState("");

  const visible = useMemo(
    () => pending.filter((item) => !dismissed.has(item.bookingId)),
    [pending, dismissed]
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedQuery) return visible;
    return visible.filter((item) => matchesQuestSearch(item, normalizedQuery));
  }, [visible, normalizedQuery]);

  const displayed = useMemo(() => {
    if (normalizedQuery) return filtered;
    return filtered.slice(0, QUEST_PREVIEW_LIMIT);
  }, [filtered, normalizedQuery]);

  const hiddenCount =
    normalizedQuery.length === 0
      ? Math.max(0, visible.length - QUEST_PREVIEW_LIMIT)
      : 0;

  const totalToday = completedCount + pending.length;
  const doneCount = completedCount + (pending.length - visible.length);
  const progressPct =
    totalToday > 0 ? Math.round((doneCount / totalToday) * 100) : 0;
  const allDone = totalToday > 0 && visible.length === 0;
  const noArrivalsToday = totalToday === 0;
  const remainingCount = visible.length;

  const progressMood =
    allDone || progressPct >= 100
      ? "complete"
      : progressPct >= 66
        ? "hot"
        : progressPct >= 33
          ? "warm"
          : doneCount > 0
            ? "started"
            : "idle";

  function handleSuccess(item: CheckInQuestItem) {
    setDismissed((prev) => new Set(prev).add(item.bookingId));
    setDialog(null);
    showToast({
      kind: "success",
      title: t("checkedInTitle"),
      message: item.guestLabel,
    });
    router.refresh();
  }

  return (
    <section
      className={[
        "checkin-quest",
        allDone && "checkin-quest--victory",
        noArrivalsToday && "checkin-quest--idle",
        `checkin-quest--mood-${progressMood}`,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="checkin-quest-title"
    >
      <div className="checkin-quest__head">
        <div className="checkin-quest__head-text">
          <p className="checkin-quest__eyebrow">{t("eyebrow")}</p>
          <h2 id="checkin-quest-title" className="checkin-quest__title">
            {t("title")}
          </h2>
          <p className="checkin-quest__subtitle">
            {t("subtitle", { time: checkInTime })}
          </p>
        </div>

        {!noArrivalsToday && (
          <div
            className="checkin-quest__progress-wrap"
            role="group"
            aria-label={t("progressAria", { done: doneCount, total: totalToday })}
          >
            <div className="checkin-quest__meter">
              <div className="checkin-quest__meter-track" aria-hidden>
                {Array.from({ length: totalToday }, (_, index) => {
                  const status =
                    index < doneCount
                      ? "done"
                      : index === doneCount && remainingCount > 0
                        ? "current"
                        : "pending";
                  return (
                    <span
                      key={index}
                      className={`checkin-quest__meter-seg checkin-quest__meter-seg--${status}`}
                    />
                  );
                })}
              </div>
              <div
                className="checkin-quest__meter-fill"
                style={{ "--quest-pct": `${progressPct}` } as React.CSSProperties}
                aria-hidden
              />
            </div>
            <p className="checkin-quest__progress-label">
              {t("progress", { done: doneCount, total: totalToday })}
            </p>
            {!allDone && remainingCount > 0 && (
              <p className="checkin-quest__progress-hint">
                {t("remaining", { count: remainingCount })}
              </p>
            )}
          </div>
        )}
      </div>

      {allDone && (
        <div className="checkin-quest__victory" role="status">
          <span className="checkin-quest__victory-icon" aria-hidden>
            ✓
          </span>
          <div>
            <p className="checkin-quest__victory-title">{t("allDoneTitle")}</p>
            <p className="checkin-quest__victory-msg">{t("allDoneMessage")}</p>
          </div>
        </div>
      )}

      {noArrivalsToday && (
        <p className="checkin-quest__idle">{t("noArrivalsToday")}</p>
      )}

      {!noArrivalsToday && !allDone && (
        <div className="checkin-quest__search-wrap">
          <label className="checkin-quest__search" htmlFor="checkin-quest-search">
            <svg
              className="checkin-quest__search-icon"
              viewBox="0 0 20 20"
              fill="currentColor"
              width="16"
              height="16"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
            <input
              id="checkin-quest-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="checkin-quest__search-input"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        </div>
      )}

      {normalizedQuery && filtered.length === 0 && (
        <p className="checkin-quest__search-empty" role="status">
          {t("noSearchResults", { query: query.trim() })}
        </p>
      )}

      {displayed.length > 0 && (
        <ul className="checkin-quest__track">
          {displayed.map((item, index) => (
            <li key={item.bookingId} className="checkin-quest__step">
              <div className="checkin-quest__connector" aria-hidden />
              <article className="checkin-quest__card">
                <div className="checkin-quest__card-badge" aria-hidden>
                  {index + 1 + completedCount}
                </div>
                <div className="checkin-quest__card-body">
                  <p className="checkin-quest__guest">{item.guestLabel}</p>
                  <p className="checkin-quest__meta">
                    {item.roomNames.length > 0
                      ? item.roomNames.join(", ")
                      : t("noRoom")}
                    {" · "}
                    {formatGuestPartyDetail(item.numAdults, item.numChildren)}
                  </p>
                  <p className="checkin-quest__dates">
                    {formatStayPeriod(item.checkIn, item.checkOut, locale, true)}
                  </p>
                </div>
                <div className="checkin-quest__card-actions">
                  <button
                    type="button"
                    className="checkin-quest__cta"
                    onClick={() => setDialog(item)}
                  >
                    {t("checkInCta")}
                  </button>
                  <Link
                    href={`/admin/bookings/${item.bookingId}`}
                    className="checkin-quest__link"
                  >
                    {t("openBooking")}
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      {hiddenCount > 0 && (
        <p className="checkin-quest__more-hint">{t("moreHidden", { count: hiddenCount })}</p>
      )}

      {dialog && (
        <GanttCheckTimeDialog
          open
          mode="checkin"
          bookingId={dialog.bookingId}
          guestName={dialog.guestName}
          plannedCheckIn={dialog.checkIn}
          plannedCheckOut={dialog.checkOut}
          onClose={() => setDialog(null)}
          onSuccess={() => handleSuccess(dialog)}
        />
      )}
    </section>
  );
}
