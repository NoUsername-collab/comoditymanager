"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import type { BookingForCheckin, CheckinSettings } from "@/domain/checkin/types";
import { flagIcon, flagSeverity } from "@/domain/checkin/flags";
import type { CheckinFlag } from "@/domain/checkin/types";
import { formatGuestPartyDetail } from "@/lib/guest-party";
import { formatStayPeriod } from "@/lib/ro-calendar";
import type { CheckInQuestItem } from "@/services/today-board";

const CheckinModal = dynamic(
  () =>
    import("@/components/admin/checkin/CheckinModal").then((m) => ({
      default: m.CheckinModal,
    })),
  { ssr: false },
);

const QUEST_PREVIEW_LIMIT = 3;

type Props = {
  checkInTime: string;
  pending: CheckInQuestItem[];
  completedCount: number;
  checkinSettings: CheckinSettings;
};

function toBookingForCheckin(item: CheckInQuestItem): BookingForCheckin {
  return {
    id: item.bookingId,
    status: "confirmata",
    total_price: item.totalPrice,
    check_in: item.checkIn,
    check_out: item.checkOut,
    guest_name: item.guestName,
    guest_last_name: item.guestLastName ?? null,
    guest_first_name: item.guestFirstName ?? null,
    guest_phone: item.guestPhone,
    guest_email: item.guestEmail,
    num_adults: item.numAdults,
    num_children: item.numChildren,
    room_names: item.roomNames,
  };
}

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

function uniqueFlags(flags: CheckinFlag[]): CheckinFlag[] {
  return [...new Set(flags)];
}

function QuestReadinessIssues({
  item,
  t,
  tCheckIn,
}: {
  item: CheckInQuestItem;
  t: ReturnType<typeof useTranslations<"admin.dashboard.checkInQuest">>;
  tCheckIn: ReturnType<typeof useTranslations<"admin.checkIn">>;
}) {
  const { readiness } = item;
  const flags = uniqueFlags(readiness.flags);

  if (readiness.status === "ok") {
    return (
      <div className="checkin-quest__issues">
        <span className="checkin-quest__issue checkin-quest__issue--ok">
          {t("readyLabel")}
        </span>
      </div>
    );
  }

  return (
    <div
      className="checkin-quest__issues"
      aria-label={
        readiness.status === "blocked"
          ? t("blockedCount", { count: flags.length })
          : t("issuesTitle")
      }
    >
      {flags.map((flag) => {
        const severity = flagSeverity(flag);
        return (
          <span
            key={flag}
            className={`checkin-quest__issue checkin-quest__issue--${severity}`}
            title={tCheckIn(`flag.${flag}`)}
          >
            <span className="checkin-quest__issue-icon" aria-hidden>
              {flagIcon(flag)}
            </span>
            {tCheckIn(`flag.${flag}`)}
          </span>
        );
      })}
    </div>
  );
}

export function CheckInMilestoneBoard({
  checkInTime,
  pending,
  completedCount,
  checkinSettings,
}: Props) {
  const t = useTranslations("admin.dashboard.checkInQuest");
  const tCheckIn = useTranslations("admin.checkIn");
  const locale = useLocale();
  const router = useRouter();
  const { showToast } = useAdminFx();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [checkinItem, setCheckinItem] = useState<CheckInQuestItem | null>(null);
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

  function handleCheckinSuccess(item: CheckInQuestItem) {
    setDismissed((prev) => new Set(prev).add(item.bookingId));
    setCheckinItem(null);
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
              <article
                className={[
                  "checkin-quest__card",
                  item.readiness.status === "blocked" &&
                    "checkin-quest__card--blocked",
                  item.readiness.status === "warning" &&
                    "checkin-quest__card--warning",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
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
                  <QuestReadinessIssues item={item} t={t} tCheckIn={tCheckIn} />
                </div>
                <div className="checkin-quest__card-actions">
                  <button
                    type="button"
                    className="checkin-quest__cta checkin-start-btn"
                    onClick={() => setCheckinItem(item)}
                  >
                    <span className="checkin-start-btn__icon" aria-hidden>
                      🔑
                    </span>
                    {tCheckIn("startCheckin")}
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

      {checkinItem && (
        <CheckinModal
          booking={toBookingForCheckin(checkinItem)}
          settings={checkinSettings}
          onClose={() => setCheckinItem(null)}
          onSuccess={() => handleCheckinSuccess(checkinItem)}
        />
      )}
    </section>
  );
}
