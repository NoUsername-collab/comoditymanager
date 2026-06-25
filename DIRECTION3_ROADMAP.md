# Direction 3 - Canvas tematic premium (Wave 3)

Wave 1 (foundation) and Wave 2 (semantic zoom) are implemented in code. This document tracks remaining premium work.

## Wave 3 scope

### 9. Year zoom - 12 month columns heatmap

- Add `GanttZoom` value `year` with `buildYearRange()` returning 12 month columns.
- Toolbar: add year option after quarter; navigation shifts by one year.
- Shell attribute: `data-gantt-zoom="year"`.

### 10. RO holidays overlay on quarter/year

- Source: `domain/calendar/ro-holidays.ts` (new).
- Render subtle marker in header cells for holiday weeks/months.

### 11. Admin palette Gantt grammar extensions

- Per-zoom CSS tokens wired into `gantt-premium.css` under `[data-gantt-zoom]`.

### 12. Theme per zoom CSS in design-families

- Move zoom grammar into `src/styles/themes/design-families/*.css`.

## Optional Wave 2 polish

- Echilibrat density profile (third tier between Operational and Panorama).
- Drill-down from summary row (currently summary click filters free rooms).