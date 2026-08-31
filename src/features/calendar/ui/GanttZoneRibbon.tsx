"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { ganttDayTimeStyle, ganttTimeHourLabel } from "@/lib/gantt-time";

export function GanttZoneRibbon({
  checkInTime,
  checkOutTime,
}: {
  checkInTime: string;
  checkOutTime: string;
}) {
  const t = useTranslations("admin.gantt.zoneRibbon");
  const style = ganttDayTimeStyle(checkInTime, checkOutTime);
  const outHour = ganttTimeHourLabel(checkOutTime);
  const inHour = ganttTimeHourLabel(checkInTime);

  return (
    <div
      className="gantt-zone-ribbon mx-3 flex items-stretch gap-0 overflow-hidden"
      style={style as CSSProperties}
      aria-label={t("ariaLabel", { checkOut: outHour, checkIn: inHour })}
    >
      <div className="gantt-zone-ribbon__segment gantt-zone-ribbon__segment--checkout">
        <span className="gantt-zone-ribbon__label">{t("checkOut", { hour: outHour })}</span>
      </div>
      <div className="gantt-zone-ribbon__segment gantt-zone-ribbon__segment--clean">
        <span className="gantt-zone-ribbon__label">{t("cleaning")}</span>
      </div>
      <div className="gantt-zone-ribbon__segment gantt-zone-ribbon__segment--checkin">
        <span className="gantt-zone-ribbon__label">{t("checkIn", { hour: inHour })}</span>
      </div>
    </div>
  );
}
