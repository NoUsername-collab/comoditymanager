import { getLocale, getTranslations } from "next-intl/server";
import { heatLevelClass, pressureLabel } from "@/domain/availability/heat";
import { formatDateWithDay } from "@/lib/ro-calendar";
import { parseIso } from "@/lib/stay-dates";
import type { MonthAvailabilityGrid } from "@/services/availability-month";

function isWeekendIso(iso: string): boolean {
  const dow = parseIso(iso).getDay();
  return dow === 0 || dow === 6;
}

function buildMonthCells(dashboard: MonthAvailabilityGrid) {
  const blanks = Array.from({ length: dashboard.leading_blanks }, (_, i) => ({
    type: "blank" as const,
    key: `b-${i}`,
  }));
  const dayCells = dashboard.days.map((d) => ({
    type: "day" as const,
    key: d.iso,
    day: d,
  }));
  return [...blanks, ...dayCells];
}

export async function AvailabilityMonthGridReadonly({
  dashboard,
  today,
}: {
  dashboard: MonthAvailabilityGrid;
  today: string;
}) {
  const locale = await getLocale();
  const tAvail = await getTranslations("admin.availabilityDashboard");
  const tCommon = await getTranslations("admin.common");
  const monthCells = buildMonthCells(dashboard);

  const weekHeaders = [
    tAvail("weekdayMon"),
    tAvail("weekdayTue"),
    tAvail("weekdayWed"),
    tAvail("weekdayThu"),
    tAvail("weekdayFri"),
    tAvail("weekdaySat"),
    tAvail("weekdaySun"),
  ];

  const legendItems = [
    { key: "relaxed", className: "avail-heat-cell--relaxed", label: tAvail("relaxed") },
    { key: "moderate", className: "avail-heat-cell--moderate", label: tAvail("moderate") },
    { key: "tight", className: "avail-heat-cell--tight", label: tAvail("tight") },
    { key: "full", className: "avail-heat-cell--full", label: tCommon("full") },
  ];

  return (
    <div className="availability-month-matrix">
      <div className="availability-month-grid availability-month-grid--calendar">
        {weekHeaders.map((h) => (
          <div key={h} className="availability-month-header">
            {h}
          </div>
        ))}
        {monthCells.map((cell) =>
          cell.type === "blank" ? (
            <div key={cell.key} className="availability-month-blank" aria-hidden />
          ) : (
            <div key={cell.key} className="availability-day-cell-slot">
              <div
                className={[
                  "availability-day-cell avail-heat-cell avail-heat-cell--readonly",
                  heatLevelClass(cell.day.free_rooms, cell.day.total_rooms),
                  isWeekendIso(cell.day.iso) && "avail-heat-cell--weekend",
                  cell.day.iso === today && "avail-heat-cell--today",
                ]
                  .filter(Boolean)
                  .join(" ")}
                title={`${formatDateWithDay(cell.day.iso, locale)} · ${cell.day.free_rooms}/${cell.day.total_rooms} ${tAvail("freeRooms").toLowerCase()} · ${pressureLabel(cell.day.pressure)}`}
              >
                <span className="avail-heat-cell__core">
                  <span className="avail-heat-cell__dow">{cell.day.weekday}</span>
                  <span className="avail-heat-cell__num">{cell.day.day}</span>
                  <span className="avail-heat-cell__metric">{cell.day.free_rooms}</span>
                </span>
              </div>
            </div>
          )
        )}
      </div>

      <div className="avail-heat-legend avail-heat-legend--compact" aria-label={tAvail("availabilityColorLegend")}>
        <span className="avail-heat-legend__mode">{tAvail("freeRooms")}</span>
        <div className="avail-heat-legend__items">
          {legendItems.map((item) => (
            <span key={item.key} className="avail-heat-legend__item">
              <span
                className={`avail-heat-legend__swatch ${item.className}`}
                aria-hidden
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
