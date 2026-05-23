import type { AdminDashboardStats } from "@/services/admin-dashboard";
import type { TodayBoard } from "@/services/today-board";
import type { MonthComparison } from "@/domain/statistics/month-compare";

export function buildHomeMoodLine(input: {
  stats: AdminDashboardStats;
  cereriCount: number;
  todayBoard: TodayBoard | null;
}): string {
  const { stats, cereriCount, todayBoard } = input;

  if (cereriCount > 0) {
    return cereriCount === 1
      ? "Ai o cerere de procesat — oaspetele așteaptă răspunsul tău."
      : `Ai ${cereriCount} cereri în așteptare — recepția are de lucru.`;
  }

  const arrivals = todayBoard?.arrivals.length ?? 0;
  if (arrivals >= 3) {
    return `Zi aglomerată: ${arrivals} sosiri confirmate azi. Mult succes la check-in!`;
  }
  if (arrivals > 0) {
    return `Azi ai ${arrivals} sosir${arrivals === 1 ? "e" : "i"} — zi de primire oaspeți.`;
  }

  if (stats.weekOccupancyPct >= 75) {
    return "Săptămână plină — camerele se mișcă bine. Continuă tot așa!";
  }

  if (stats.occupancyTonightPct === 0 && stats.activeRooms > 0) {
    return "Seară liniștită — toate camerele sunt libere diseară. Poți respira.";
  }

  if (stats.freeTonight === stats.activeRooms && stats.activeRooms > 0) {
    return "Nicio cameră ocupată diseară — perfect pentru pregătiri sau odihnă.";
  }

  return "Totul arată bine la recepție. O zi bună la Casa Emil!";
}

export function buildHomeBriefing(input: {
  todayBoard: TodayBoard | null;
  cereriCount: number;
}): string | null {
  const { todayBoard, cereriCount } = input;
  if (!todayBoard) return null;

  const parts: string[] = [];
  if (todayBoard.arrivals.length > 0) {
    parts.push(
      `${todayBoard.arrivals.length} sosir${todayBoard.arrivals.length === 1 ? "e" : "i"}`
    );
  }
  if (todayBoard.departures.length > 0) {
    parts.push(
      `${todayBoard.departures.length} plecar${todayBoard.departures.length === 1 ? "e" : "i"}`
    );
  }
  if (todayBoard.roomsToClean.length > 0) {
    parts.push(
      `${todayBoard.roomsToClean.length} de curățat`
    );
  }
  if (cereriCount > 0) {
    parts.push(
      `${cereriCount} cerer${cereriCount === 1 ? "ă" : "i"} nou${cereriCount === 1 ? "ă" : "i"}`
    );
  }

  if (parts.length === 0) {
    return "Briefing azi: niciun check-in/out programat, nicio cerere în așteptare.";
  }

  return `Briefing azi: ${parts.join(" · ")}.`;
}

export type HomeMilestone = {
  id: string;
  emoji: string;
  label: string;
};

export function buildHomeMilestones(input: {
  totalConfirmed: number;
  stats: AdminDashboardStats;
  monthCompare: MonthComparison | null;
  cereriCount: number;
}): HomeMilestone[] {
  const out: HomeMilestone[] = [];
  const { totalConfirmed, stats, monthCompare, cereriCount } = input;

  if (totalConfirmed >= 1) {
    out.push({ id: "first", emoji: "🎉", label: "Prima confirmare" });
  }
  if (totalConfirmed >= 10) {
    out.push({ id: "ten", emoji: "🏅", label: "10 sejururi confirmate" });
  }
  if (totalConfirmed >= 50) {
    out.push({ id: "fifty", emoji: "⭐", label: "50 sejururi confirmate" });
  }
  if (totalConfirmed >= 100) {
    out.push({ id: "hundred", emoji: "💫", label: "100 sejururi confirmate" });
  }
  if (monthCompare && monthCompare.current.occupancyPct >= 50) {
    out.push({
      id: "month-half",
      emoji: "📈",
      label: `${monthCompare.current.occupancyPct}% ocupare luna asta`,
    });
  }
  if (stats.weekOccupancyPct >= 80) {
    out.push({
      id: "week-full",
      emoji: "🔥",
      label: "Săptămână la capacitate",
    });
  }
  if (cereriCount === 0 && totalConfirmed > 0) {
    out.push({ id: "inbox-zero", emoji: "✨", label: "Inbox zero — fără cereri" });
  }

  return out.slice(-5);
}
