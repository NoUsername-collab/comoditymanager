/** ADR — venit camere / nopți cameră ocupată */
export function computeAdrRon(
  revenueRon: number,
  roomNightsOccupied: number
): number | null {
  if (roomNightsOccupied <= 0 || revenueRon <= 0) return null;
  return Math.round((revenueRon / roomNightsOccupied) * 100) / 100;
}

/** RevPAR — venit camere / nopți cameră disponibile (capacitate) */
export function computeRevparRon(
  revenueRon: number,
  roomNightsCapacity: number
): number | null {
  if (roomNightsCapacity <= 0 || revenueRon <= 0) return null;
  return Math.round((revenueRon / roomNightsCapacity) * 100) / 100;
}

export type RevenueKpiMetrics = {
  adrRon: number | null;
  revparRon: number | null;
};

export function computeRevenueKpis(input: {
  revenueRon: number;
  roomNightsOccupied: number;
  roomNightsCapacity: number;
}): RevenueKpiMetrics {
  return {
    adrRon: computeAdrRon(input.revenueRon, input.roomNightsOccupied),
    revparRon: computeRevparRon(input.revenueRon, input.roomNightsCapacity),
  };
}
