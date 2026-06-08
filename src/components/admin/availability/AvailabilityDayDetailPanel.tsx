"use client";

import { Link } from "@/i18n/navigation";
import { AdminTextActionLink } from "@/components/admin/ui/AdminTextAction";
import { pressureLabel } from "@/domain/availability/heat";
import { mondayOfWeekIso } from "@/domain/availability/week-range";
import { guestInitials } from "@/domain/guest-name";
import type { DayAvailabilityDetail } from "@/services/availability-month";
import { RoomFeatureBadges } from "@/components/admin/catalog/RoomFeatureBadges";

export function DayDetailPanel({
  detail,
  year,
  month,
  labels,
}: {
  detail: DayAvailabilityDetail;
  year: number;
  month: number;
  labels: {
    free: string;
    occupied: string;
    rooms: string;
    arrivals: string;
    departures: string;
    unassignedRequest: string;
    unassignedRequestSuffix: string;
    processArrow: string;
    pendingRequestWithRooms: string;
    freeTitle: string;
    addBooking: string;
    requestsPerRoom: string;
    occupiedTitle: string;
    focusGanttWeek: string;
  };
}) {
  const { day, rooms } = detail;
  const free = rooms.filter((r) => r.status === "free");
  const occupied = rooms.filter((r) => r.status === "occupied");
  const cereri = rooms.filter((r) => r.status === "cerere");

  function roomSubtitle(r: (typeof rooms)[number]) {
    return (
      <>
        {r.building_name}
        <RoomFeatureBadges
          roomTypeName={r.room_type_name}
          optionSlugs={r.option_slugs}
          hasAc={r.has_ac}
          compact
        />
      </>
    );
  }

  return (
    <div className="availability-detail-panel availability-detail-panel--overlay avail-detail flex flex-col">
      <div className="border-b border-zinc-100 bg-zinc-50/80 px-5 py-3">
        <p className="text-sm font-medium text-emerald-800">
          {pressureLabel(day.pressure)}
        </p>
        <p className="mt-0.5 text-sm text-zinc-600">
          {day.free_rooms} {labels.free.toLowerCase()} · {day.occupied_rooms}{" "}
          {labels.occupied.toLowerCase()} · {day.total_rooms}{" "}
          {labels.rooms.toLowerCase()}
          {day.checkins > 0 && ` · ${day.checkins} ${labels.arrivals.toLowerCase()}`}
          {day.checkouts > 0 && ` · ${day.checkouts} ${labels.departures.toLowerCase()}`}
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {detail.unassigned_cereri > 0 && (
          <Link
            href="/admin/bookings"
            className="admin-cereri-glow block rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-900 hover:bg-red-100"
          >
            {detail.unassigned_cereri} {labels.unassignedRequest}
            {detail.unassigned_cereri !== 1 ? labels.unassignedRequestSuffix : ""} —{" "}
            {labels.processArrow}
          </Link>
        )}
        {detail.pending_cereri > 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
            {detail.pending_cereri} {labels.pendingRequestWithRooms}
          </p>
        )}

        {free.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {labels.freeTitle} ({free.length})
            </h3>
            <ul className="mt-2 space-y-1.5">
              {free.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/admin/calendar?y=${year}&m=${month}`}
                    className="avail-room-tile avail-room-tile--free w-full"
                  >
                    <span
                      className="avail-room-tile__dot"
                      style={{ background: r.building_color }}
                    />
                    <span className="min-w-0 flex-1 text-left text-sm font-medium">
                      {r.name}
                      <span className="block text-[10px] text-zinc-500">
                        {roomSubtitle(r)}
                      </span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700">
                      + {labels.addBooking}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {cereri.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              {labels.requestsPerRoom} ({cereri.length})
            </h3>
            <ul className="mt-2 space-y-1.5">
              {cereri.map((r) => (
                <li key={r.id}>
                  <Link
                    href={r.booking_id ? `/admin/bookings/${r.booking_id}` : "/admin/bookings"}
                    className="avail-room-tile avail-room-tile--cerere w-full"
                  >
                    <span
                      className="avail-room-tile__avatar"
                      style={{ background: r.building_color }}
                    >
                      {guestInitials(null, null, r.guest_name)}
                    </span>
                    <span className="min-w-0 flex-1 text-left text-sm">
                      {r.name} · {r.guest_name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {occupied.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-rose-700">
              {labels.occupiedTitle} ({occupied.length})
            </h3>
            <ul className="mt-2 space-y-1.5">
              {occupied.map((r) => (
                <li key={r.id}>
                  <Link
                    href={r.booking_id ? `/admin/bookings/${r.booking_id}` : "#"}
                    className="avail-room-tile avail-room-tile--occupied w-full"
                  >
                    <span
                      className="avail-room-tile__avatar"
                      style={{ background: r.building_color }}
                    >
                      {guestInitials(null, null, r.guest_name)}
                    </span>
                    <span className="min-w-0 flex-1 text-left text-sm font-medium">
                      {r.name}
                      <span className="block text-xs text-zinc-500">{r.guest_name}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 border-t border-zinc-100 px-5 py-3">
        <AdminTextActionLink
          href={`/admin/calendar?y=${day.iso.slice(0, 4)}&m=${Number(day.iso.slice(5, 7)) - 1}&ws=${mondayOfWeekIso(day.iso)}`}
          variant="primary"
          className="text-sm"
        >
          {labels.focusGanttWeek} →
        </AdminTextActionLink>
      </div>
    </div>
  );
}
