"use client";

import type { CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { GanttStayTimeline } from "@/domain/gantt/stay-card-display";
import {
  shouldShowGanttPopoverNights,
  shouldShowGanttPopoverRoomKeys,
} from "@/domain/gantt/stay-card-display";
import {
  GanttStayNightsSlider,
  GanttStayRoomsSlider,
  GanttStayTimeline as GanttStayTimelineBar,
} from "@/components/admin/gantt/GanttStayTimeline";
import { computeRoomCheckinProgress } from "@/domain/checkin/room-checkin-progress";
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
  timeline?: GanttStayTimeline | null;
  showUnpaid?: boolean;
  showMissingIdentity?: boolean;
  keysHandedRooms?: string[];
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

function timelineSummary(
  timeline: GanttStayTimeline,
  tGantt: ReturnType<typeof useTranslations<"admin.gantt">>
): string {
  if (timeline.variant === "hybrid") {
    if (!timeline.milestoneReached) {
      return tGantt("stayCard.hybridCheckin", {
        checked: timeline.roomsChecked,
        total: timeline.roomsTotal,
      });
    }
    return tGantt("stayCard.hybridStay", {
      current: timeline.nightsCurrent,
      total: timeline.nightsTotal,
    });
  }
  if (timeline.variant === "checkin") {
    return tGantt("stayCard.roomsProgress", {
      checked: timeline.roomsChecked,
      total: timeline.roomsTotal,
    });
  }
  return tGantt("stayCard.nightsProgress", {
    current: timeline.nightsCurrent,
    total: timeline.nightsTotal,
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
  const accent = data.buildingColor ?? (isCerere ? "var(--pending-border)" : "var(--active-border)");
  const nights = stayNightCount(data.checkIn, data.checkOut);
  const rooms = resolveRoomList(data);
  const keysHandedRooms = data.keysHandedRooms ?? [];
  const keysProgress =
    rooms.length > 0
      ? computeRoomCheckinProgress(rooms, keysHandedRooms)
      : null;
  const periodLabel = formatStayPeriod(data.checkIn, data.checkOut, locale, true);
  const timeline = data.timeline ?? null;
  const showRoomKeys =
    keysProgress != null &&
    keysProgress.isMultiRoom &&
    (keysProgress.checked > 0 ||
      (timeline != null &&
        shouldShowGanttPopoverRoomKeys(timeline, !!data.actualCheckInAt)));
  const showNights = timeline != null && shouldShowGanttPopoverNights(timeline);
  const showCombinedTimeline =
    timeline != null && !showRoomKeys && !showNights;

  return (
    <AdminFloatingPanel
      open={visible && !!anchorRect}
      onClose={() => {}}
      anchorRect={anchorRect}
      variant="popover"
      showBackdrop={false}
      closeOnEscape={false}
      width={272}
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

        {timeline ? (
          <section className="gantt-stay-note__block gantt-stay-note__block--progress">
            {showRoomKeys && keysProgress ? (
              <div className="gantt-stay-note__progress-row">
                <p className="gantt-stay-note__label">{tGantt("stayCard.keys")}</p>
                <p className="gantt-stay-note__progress-title">
                  {tGantt("stayCard.roomsProgress", {
                    checked: keysProgress.checked,
                    total: keysProgress.total,
                  })}
                </p>
                <GanttStayRoomsSlider
                  checked={keysProgress.checked}
                  total={keysProgress.total}
                  className="gantt-stay__timeline--popover"
                />
              </div>
            ) : null}
            {showNights ? (
              <div
                className={[
                  "gantt-stay-note__progress-row",
                  showRoomKeys && "gantt-stay-note__progress-row--spaced",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <p className="gantt-stay-note__label">{tGantt("stayCard.stay")}</p>
                <p className="gantt-stay-note__progress-title">
                  {tGantt("stayCard.nightsProgress", {
                    current: timeline.nightsCurrent,
                    total: timeline.nightsTotal,
                  })}
                </p>
                <GanttStayNightsSlider
                  current={timeline.nightsCurrent}
                  total={timeline.nightsTotal}
                  className="gantt-stay__timeline--popover"
                />
              </div>
            ) : null}
            {showCombinedTimeline ? (
              <div className="gantt-stay-note__progress-row">
                <p className="gantt-stay-note__label">{tGantt("stayCard.progress")}</p>
                <p className="gantt-stay-note__progress-title">
                  {timelineSummary(timeline, tGantt)}
                </p>
                <GanttStayTimelineBar
                  timeline={timeline}
                  className="gantt-stay__timeline--popover"
                />
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="gantt-stay-note__block gantt-stay-note__block--rooms">
          <p className="gantt-stay-note__label">{tGantt("rooms")}</p>
          {rooms.length > 0 ? (
            <ul className="gantt-stay-note__room-list">
              {rooms.map((room) => {
                const keyHanded = keysHandedRooms.some(
                  (r) => r.toLowerCase() === room.toLowerCase(),
                );
                return (
                  <li key={room} className="gantt-stay-note__room">
                    {keyHanded ? (
                      <span
                        className="gantt-stay-note__room-key"
                        title={tGantt("stayCard.keyHanded")}
                        aria-label={tGantt("stayCard.keyHanded")}
                      >
                        🔑
                      </span>
                    ) : null}
                    {room}
                  </li>
                );
              })}
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
