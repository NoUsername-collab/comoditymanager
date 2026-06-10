"use client";

import type { CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { GanttStayBarProgress } from "@/domain/gantt/stay-card-display";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { stayNightCount } from "@/lib/stay-dates";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";

export type GanttStayPopoverData = {
  bookingId: string;
  guestName: string;
  label: string;
  checkIn: string;
  checkOut: string;
  /** Data reală de sosire a rezervării (nu segmentul vizibil pe timeline). */
  bookingCheckIn?: string;
  status: "cerere_noua" | "confirmata";
  actualCheckInAt?: string | null;
  actualCheckOutAt?: string | null;
  numAdults: number;
  numChildren: number;
  checkInTime: string;
  checkOutTime: string;
  continuesBefore: boolean;
  continuesAfter: boolean;
  buildingColor?: string | null;
  roomId?: string;
  roomName?: string;
  roomNames?: string[];
  guestPhone?: string | null;
  totalPrice?: number | null;
  canMoveRoom?: boolean;
  onMoveRoom?: () => void;
  progress?: GanttStayBarProgress | null;
  showUnpaid?: boolean;
  showMissingIdentity?: boolean;
};

function resolveRoomList(data: GanttStayPopoverData): string[] {
  if (data.roomNames && data.roomNames.length > 0) {
    return [...new Set(data.roomNames.filter(Boolean))];
  }
  if (data.roomName?.trim()) {
    return [data.roomName.trim()];
  }
  return [];
}

function progressLabel(
  progress: GanttStayBarProgress,
  tGantt: ReturnType<typeof useTranslations<"admin.gantt">>
): string {
  if (progress.mode === "rooms") {
    return tGantt("stayCard.roomsProgress", {
      checked: progress.current,
      total: progress.total,
    });
  }
  return tGantt("stayCard.nightsProgress", {
    current: progress.current,
    total: progress.total,
  });
}

export function GanttStayPopover({
  data,
  anchorRect,
  visible,
  onMouseEnter,
  onMouseLeave,
}: {
  data: GanttStayPopoverData;
  anchorRect: DOMRect | null;
  visible: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  today?: string;
}) {
  const tCommon = useTranslations("admin.common");
  const tGantt = useTranslations("admin.gantt");
  const locale = useLocale();
  const isCerere = data.status === "cerere_noua";
  const accent = data.buildingColor ?? (isCerere ? "#d97706" : "#059669");
  const nights = stayNightCount(data.checkIn, data.checkOut);
  const rooms = resolveRoomList(data);
  const periodLabel = formatStayPeriod(data.checkIn, data.checkOut, locale, true);
  const progress = data.progress ?? null;

  return (
    <AdminFloatingPanel
      open={visible && !!anchorRect}
      onClose={() => {}}
      anchorRect={anchorRect}
      variant="popover"
      showBackdrop={false}
      closeOnEscape={false}
      width={228}
      className="gantt-stay-note admin-floating-panel--gantt"
      onPanelMouseEnter={onMouseEnter}
      onPanelMouseLeave={onMouseLeave}
    >
      <article
        className={[
          "gantt-stay-note__paper",
          isCerere && "gantt-stay-note__paper--cerere",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ "--stay-note-accent": accent } as CSSProperties}
        data-gantt-no-drag=""
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span className="gantt-stay-note__pin" aria-hidden />

        <header className="gantt-stay-note__head">
          <h3 className="gantt-stay-note__name">{data.guestName}</h3>
          {(data.showUnpaid || data.showMissingIdentity) && (
            <div className="gantt-stay-note__alerts">
              {data.showUnpaid ? (
                <span className="gantt-stay-note__alert gantt-stay-note__alert--unpaid">
                  {tGantt("stayCard.unpaid")}
                </span>
              ) : null}
              {data.showMissingIdentity ? (
                <span className="gantt-stay-note__alert gantt-stay-note__alert--identity">
                  {tGantt("stayCard.missingIdentity")}
                </span>
              ) : null}
            </div>
          )}
        </header>

        <section className="gantt-stay-note__block">
          <p className="gantt-stay-note__label">{tCommon("period")}</p>
          <p className="gantt-stay-note__duration">{periodLabel}</p>
          <p className="gantt-stay-note__nights">
            {nights} {tCommon("nights").toLowerCase()}
          </p>
        </section>

        {progress ? (
          <section className="gantt-stay-note__block gantt-stay-note__block--progress">
            <p className="gantt-stay-note__label">{tGantt("stayCard.progress")}</p>
            <p className="gantt-stay-note__progress-title">
              {progressLabel(progress, tGantt)}
            </p>
            <div
              className={[
                "gantt-stay-note__progress",
                progress.mode === "rooms" && "gantt-stay-note__progress--rooms",
              ]
                .filter(Boolean)
                .join(" ")}
              role="progressbar"
              aria-valuenow={progress.current}
              aria-valuemin={0}
              aria-valuemax={progress.total}
            >
              <span
                className="gantt-stay-note__progress-fill"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </section>
        ) : null}

        <section className="gantt-stay-note__block gantt-stay-note__block--rooms">
          <p className="gantt-stay-note__label">{tGantt("rooms")}</p>
          {rooms.length > 0 ? (
            <ul className="gantt-stay-note__room-list">
              {rooms.map((room) => (
                <li key={room} className="gantt-stay-note__room">
                  {room}
                </li>
              ))}
            </ul>
          ) : (
            <p className="gantt-stay-note__room gantt-stay-note__room--empty">—</p>
          )}
        </section>

        {isCerere ? (
          <span className="gantt-stay-note__stamp" aria-hidden>
            CERERE
          </span>
        ) : null}
      </article>
    </AdminFloatingPanel>
  );
}
