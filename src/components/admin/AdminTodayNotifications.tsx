import { formatDateWithDay } from "@/lib/ro-calendar";
import type { TodayBoard } from "@/services/today-board";

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "arrival" | "departure" | "clean" | "alert";
}) {
  return (
    <article
      className={[
        "admin-hud-today__chip",
        `admin-hud-today__chip--${tone}`,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <strong className="admin-hud-today__chip-value">{value}</strong>
      <span className="admin-hud-today__chip-label">{label}</span>
    </article>
  );
}

export function AdminTodayNotifications({
  board,
  cereriCount,
}: {
  board: TodayBoard | null;
  cereriCount: number;
}) {
  if (!board) {
    return (
      <div className="admin-hud-today admin-hud-today--empty">
        <p className="admin-hud-today__label">Azi</p>
        <p className="admin-hud-today__fallback">Panoul de notificări nu este disponibil acum.</p>
      </div>
    );
  }

  return (
    <section className="admin-hud-today" aria-label="Notificări pentru azi">
      <div className="admin-hud-today__block admin-hud-today__block--info">
        <p className="admin-hud-today__label">Azi</p>
        <p className="admin-hud-today__date">{formatDateWithDay(board.todayIso, true)}</p>
        <div className="admin-hud-today__meta">
          <span>Check-in {board.checkInTime}</span>
          <span>Check-out {board.checkOutTime}</span>
        </div>
      </div>

      <div className="admin-hud-today__block admin-hud-today__block--stats">
        <p className="admin-hud-today__section-title">Flux azi</p>
        <div className="admin-hud-today__stats">
        <StatChip label="sosiri" value={board.arrivals.length} tone="arrival" />
        <StatChip label="plecări" value={board.departures.length} tone="departure" />
        <StatChip label="de curățat" value={board.roomsToClean.length} tone="clean" />
        <StatChip label="cereri noi" value={cereriCount} tone={cereriCount > 0 ? "alert" : "default"} />
        </div>
      </div>
    </section>
  );
}
