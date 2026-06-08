"use client";

import { useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { GanttCheckTimeDialog } from "@/components/admin/gantt/GanttCheckTimeDialog";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { formatGuestPartyDetail } from "@/lib/guest-party";
import { formatStayPeriod } from "@/lib/ro-calendar";
import type { CheckInQuestItem } from "@/services/today-board";

type Props = {
  todayIso: string;
  checkInTime: string;
  pending: CheckInQuestItem[];
  completedCount: number;
};

export function CheckInMilestoneBoard({
  todayIso,
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

  const visible = useMemo(
    () => pending.filter((item) => !dismissed.has(item.bookingId)),
    [pending, dismissed]
  );

  const totalToday = completedCount + pending.length;
  const doneCount = completedCount + (pending.length - visible.length);
  const progressPct =
    totalToday > 0 ? Math.round((doneCount / totalToday) * 100) : 0;
  const allDone = totalToday > 0 && visible.length === 0;
  const noArrivalsToday = totalToday === 0;

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
          <div className="checkin-quest__progress-wrap" aria-hidden={allDone}>
            <div
              className="checkin-quest__ring"
              style={{ "--quest-pct": `${progressPct}` } as React.CSSProperties}
            >
              <span className="checkin-quest__ring-value">{progressPct}%</span>
            </div>
            <p className="checkin-quest__progress-label">
              {t("progress", { done: doneCount, total: totalToday })}
            </p>
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

      {visible.length > 0 && (
        <ul className="checkin-quest__track">
          {visible.map((item, index) => (
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
