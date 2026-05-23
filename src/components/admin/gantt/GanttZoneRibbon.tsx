import type { CSSProperties } from "react";
import { ganttDayTimeStyle, ganttTimeHourLabel } from "@/lib/gantt-time";

export function GanttZoneRibbon({
  checkInTime,
  checkOutTime,
}: {
  checkInTime: string;
  checkOutTime: string;
}) {
  const style = ganttDayTimeStyle(checkInTime, checkOutTime);
  const outHour = ganttTimeHourLabel(checkOutTime);
  const inHour = ganttTimeHourLabel(checkInTime);

  return (
    <div
      className="gantt-zone-ribbon mx-3 flex items-stretch gap-0 overflow-hidden"
      style={style as CSSProperties}
      aria-label={`Check-out ${outHour}, curățenie, check-in ${inHour}`}
    >
      <div className="gantt-zone-ribbon__segment gantt-zone-ribbon__segment--checkout">
        <span className="gantt-zone-ribbon__label">Check-out {outHour}</span>
      </div>
      <div className="gantt-zone-ribbon__segment gantt-zone-ribbon__segment--clean">
        <span className="gantt-zone-ribbon__label">Curățenie</span>
      </div>
      <div className="gantt-zone-ribbon__segment gantt-zone-ribbon__segment--checkin">
        <span className="gantt-zone-ribbon__label">Check-in {inHour}</span>
      </div>
    </div>
  );
}
