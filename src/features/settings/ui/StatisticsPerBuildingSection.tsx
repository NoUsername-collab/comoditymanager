export type StatisticsBuildingRow = {
  buildingId: string;
  buildingName: string;
  activeRooms: number;
  confirmedStays: number;
  occupancyPct: number;
  guestNights: number;
  revenueRon: number;
};

type Labels = {
  building: string;
  roomsCol: string;
  staysCol: string;
  occupancy: string;
  nights: string;
  revenue: string;
};

export function StatisticsPerBuildingSection({
  title,
  buildings,
  labels,
  formatRevenue,
}: {
  title: string;
  buildings: StatisticsBuildingRow[];
  labels: Labels;
  formatRevenue: (n: number) => string;
}) {
  if (buildings.length === 0) return null;

  return (
    <div className="statistics-building-section overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      </div>

      <ul className="statistics-cards space-y-2 p-3">
        {buildings.map((building) => (
          <li
            key={building.buildingId}
            className="statistics-card rounded-xl border border-zinc-200 bg-zinc-50/80 p-3"
          >
            <p className="text-sm font-semibold text-zinc-900">
              {building.buildingName}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <Stat label={labels.roomsCol} value={String(building.activeRooms)} />
              <Stat label={labels.staysCol} value={String(building.confirmedStays)} />
              <Stat label={labels.occupancy} value={`${building.occupancyPct}%`} />
              <Stat label={labels.nights} value={String(building.guestNights)} />
              <Stat
                label={labels.revenue}
                value={formatRevenue(building.revenueRon)}
                className="col-span-2"
              />
            </dl>
          </li>
        ))}
      </ul>

      <div className="statistics-table-desktop overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2">{labels.building}</th>
              <th className="px-4 py-2">{labels.roomsCol}</th>
              <th className="px-4 py-2">{labels.staysCol}</th>
              <th className="px-4 py-2">{labels.occupancy}</th>
              <th className="px-4 py-2">{labels.nights}</th>
              <th className="px-4 py-2">{labels.revenue}</th>
            </tr>
          </thead>
          <tbody>
            {buildings.map((building) => (
              <tr key={building.buildingId} className="border-t border-zinc-100">
                <td className="px-4 py-2.5 font-medium text-zinc-900">
                  {building.buildingName}
                </td>
                <td className="px-4 py-2.5 tabular-nums">{building.activeRooms}</td>
                <td className="px-4 py-2.5 tabular-nums">
                  {building.confirmedStays}
                </td>
                <td className="px-4 py-2.5 tabular-nums">
                  {building.occupancyPct}%
                </td>
                <td className="px-4 py-2.5 tabular-nums">{building.guestNights}</td>
                <td className="px-4 py-2.5 tabular-nums">
                  {formatRevenue(building.revenueRon)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </dt>
      <dd className="mt-0.5 font-semibold tabular-nums text-zinc-800">{value}</dd>
    </div>
  );
}
