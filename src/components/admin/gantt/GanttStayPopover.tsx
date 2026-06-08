"use client";

import type { CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
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
        </header>

        <section className="gantt-stay-note__block">
          <p className="gantt-stay-note__label">{tCommon("period")}</p>
          <p className="gantt-stay-note__duration">{periodLabel}</p>
          <p className="gantt-stay-note__nights">
            {nights} {tCommon("nights").toLowerCase()}
          </p>
        </section>

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
