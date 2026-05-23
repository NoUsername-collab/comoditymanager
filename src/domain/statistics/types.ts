export type MonthIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type MonthStatistics = {
  month: MonthIndex;
  label: string;
  confirmedStays: number;
  guestNights: number;
  roomNightsOccupied: number;
  roomNightsCapacity: number;
  occupancyPct: number;
  revenueRon: number;
};

export type BuildingYearStatistics = {
  buildingId: string;
  buildingName: string;
  activeRooms: number;
  confirmedStays: number;
  guestNights: number;
  roomNightsOccupied: number;
  roomNightsCapacity: number;
  occupancyPct: number;
  revenueRon: number;
};

export type YearStatistics = {
  year: number;
  confirmedStays: number;
  cereriCreated: number;
  cancelledStays: number;
  guestNights: number;
  roomNightsOccupied: number;
  roomNightsCapacity: number;
  occupancyPct: number;
  revenueRon: number;
  revenueComplete: boolean;
  adults: number;
  children: number;
  months: MonthStatistics[];
  buildings: BuildingYearStatistics[];
};

export type StatisticsReport = {
  generatedAt: string;
  firstYear: number;
  lastYear: number;
  totalActiveRooms: number;
  years: YearStatistics[];
  /** Anii cu cel puțin o înregistrare (pentru UI) */
  yearsWithData: number[];
  note: string;
};
