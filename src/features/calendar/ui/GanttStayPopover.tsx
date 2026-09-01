"use client";

import type { CSSProperties, ReactNode } from "react";
import { useId } from "react";
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
} from "@/features/calendar/ui/GanttStayTimeline";
import { computeRoomCheckinProgress } from "@/domain/checkin/room-checkin-progress";
import { formatDateWithDay } from "@/lib/ro-calendar";
import { stayNightCount } from "@/lib/stay-dates";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import type { GanttStayPopoverData } from "@/domain/gantt/drafts";

export type { GanttStayPopoverData };

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

function timelineFraction(timeline: GanttStayTimeline): string {
  if (timeline.variant === "hybrid") {
    if (!timeline.milestoneReached) {
      return `${timeline.roomsChecked}/${timeline.roomsTotal}`;
    }
    return `${timeline.nightsCurrent}/${timeline.nightsTotal}`;
  }
  if (timeline.variant === "checkin") {
    return `${timeline.roomsChecked}/${timeline.roomsTotal}`;
  }
  return `${timeline.nightsCurrent}/${timeline.nightsTotal}`;
}

function PeriodCalendarIcon() {
  return (
    <svg
      className="gantt-stay-note__period-icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function StayProgressRow({
  label,
  summary,
  fraction,
  children,
}: {
  label: string;
  summary: string;
  fraction: string;
  children: ReactNode;
}) {
  return (
    <div className="gantt-stay-note__progress" role="group" aria-label={summary}>
      <span className="gantt-stay-note__progress-label">{label}</span>
      <div className="gantt-stay-note__progress-track">{children}</div>
      <span className="gantt-stay-note__progress-frac" aria-hidden>
        {fraction}
      </span>
      <span className="sr-only">{summary}</span>
    </div>
  );
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
  const titleId = useId();
  const tCommon = useTranslations("admin.common");
  const tGantt = useTranslations("admin.gantt");
  const tFlow = useTranslations("booking.flowStatus");
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
  const checkInLabel = formatDateWithDay(data.checkIn, locale, true);
  const checkOutLabel = formatDateWithDay(data.checkOut, locale, true);
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
  const hasStatusPills =
    isCerere || data.showUnpaid || data.showMissingIdentity;

  return (
    <AdminFloatingPanel
      open={visible && !!anchorRect}
      onClose={() => {}}
      anchorRect={anchorRect}
      variant="popover"
      showBackdrop={false}
      closeOnEscape={false}
      width={300}
      className="gantt-stay-note admin-floating-panel--gantt"
      onPanelMouseEnter={onMouseEnter}
      onPanelMouseLeave={onMouseLeave}
    >
      <article
        className={[
          "gantt-stay-note__card",
          isCerere && "gantt-stay-note__card--cerere",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ "--stay-note-accent": accent } as CSSProperties}
        data-gantt-no-drag=""
        aria-labelledby={titleId}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <header className="gantt-stay-note__header">
          {hasStatusPills ? (
            <div className="gantt-stay-note__status-row">
              {isCerere ? (
                <span className="gantt-stay-note__status gantt-stay-note__status--pending">
                  {tFlow("cerere_noua")}
                </span>
              ) : null}
              {data.showUnpaid ? (
                <span className="gantt-stay-note__status gantt-stay-note__status--unpaid">
                  {tGantt("stayCard.unpaid")}
                </span>
              ) : null}
              {data.showMissingIdentity ? (
                <span className="gantt-stay-note__status gantt-stay-note__status--identity">
                  {tGantt("stayCard.missingIdentity")}
                </span>
              ) : null}
            </div>
          ) : null}
          <h3 id={titleId} className="gantt-stay-note__name">
            {data.guestName}
          </h3>
        </header>

        <section
          className="gantt-stay-note__section"
          aria-label={tCommon("period")}
        >
          <div className="gantt-stay-note__period">
            <PeriodCalendarIcon />
            <div className="gantt-stay-note__period-dates">
              <span className="gantt-stay-note__period-from">{checkInLabel}</span>
              <span className="gantt-stay-note__period-arrow" aria-hidden>
                →
              </span>
              <span className="gantt-stay-note__period-to">{checkOutLabel}</span>
            </div>
          </div>
          <p className="gantt-stay-note__nights">
            {nights} {tCommon("nights").toLowerCase()}
          </p>
        </section>

        {timeline ? (
          <section
            className="gantt-stay-note__section gantt-stay-note__section--progress"
            aria-label={tGantt("stayCard.progress")}
          >
            {showRoomKeys && keysProgress ? (
              <StayProgressRow
                label={tGantt("stayCard.keys")}
                summary={tGantt("stayCard.roomsProgress", {
                  checked: keysProgress.checked,
                  total: keysProgress.total,
                })}
                fraction={`${keysProgress.checked}/${keysProgress.total}`}
              >
                <GanttStayRoomsSlider
                  checked={keysProgress.checked}
                  total={keysProgress.total}
                  className="gantt-stay__timeline--popover"
                />
              </StayProgressRow>
            ) : null}
            {showNights ? (
              <StayProgressRow
                label={tGantt("stayCard.stay")}
                summary={tGantt("stayCard.nightsProgress", {
                  current: timeline.nightsCurrent,
                  total: timeline.nightsTotal,
                })}
                fraction={`${timeline.nightsCurrent}/${timeline.nightsTotal}`}
              >
                <GanttStayNightsSlider
                  current={timeline.nightsCurrent}
                  total={timeline.nightsTotal}
                  className="gantt-stay__timeline--popover"
                />
              </StayProgressRow>
            ) : null}
            {showCombinedTimeline ? (
              <StayProgressRow
                label={tGantt("stayCard.progress")}
                summary={timelineSummary(timeline, tGantt)}
                fraction={timelineFraction(timeline)}
              >
                <GanttStayTimelineBar
                  timeline={timeline}
                  className="gantt-stay__timeline--popover"
                />
              </StayProgressRow>
            ) : null}
          </section>
        ) : null}

        <section
          className="gantt-stay-note__section gantt-stay-note__section--rooms"
          aria-label={tGantt("rooms")}
        >
          <p className="gantt-stay-note__section-label">{tGantt("rooms")}</p>
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
      </article>
    </AdminFloatingPanel>
  );
}
