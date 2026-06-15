import { Link } from "@/i18n/navigation";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { formatBookingRef } from "@/lib/booking-admin-links";
import { GuestFlagPill } from "@/components/admin/guests/GuestFlagPill";
import { GuestScoreHint } from "@/components/admin/guests/GuestScoreHint";
import { StayCheckinProgress } from "@/components/admin/cazari/StayCheckinProgress";
import {
  computeRoomCheckinProgress,
  shouldShowRoomCheckinProgress,
} from "@/domain/checkin/room-checkin-progress";
import type { CazariLabels, StayCardRow } from "@/components/admin/cazari/types";

export function StayInfo({
  stay,
  labels,
  variant = "operational",
  operativeToday,
}: {
  stay: StayCardRow;
  labels: CazariLabels;
  variant?: "operational" | "refuzate";
  /** Ziua operațională (simulare) — pentru a ascunde progresul înainte de sosire. */
  operativeToday?: string;
}) {
  const isConfirmed = stay.status === "confirmata";
  const isCancelled = stay.status === "anulata" || variant === "refuzate";
  const checkedInRooms =
    "checked_in_rooms" in stay ? (stay.checked_in_rooms ?? []) : [];
  const keysHandedRooms =
    "keys_handed_rooms" in stay ? (stay.keys_handed_rooms ?? []) : [];
  const roomIdVerified =
    "room_id_verified" in stay ? (stay.room_id_verified ?? []) : [];
  const roomProgress = isConfirmed
    ? computeRoomCheckinProgress(stay.room_names, checkedInRooms)
    : null;

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p
              className={[
                "truncate text-[13px] font-bold leading-tight",
                isCancelled ? "text-red-950" : "text-zinc-900",
              ].join(" ")}
            >
              {stay.guest_name}
            </p>
            <GuestFlagPill flagLevel={stay.guest_alert_level} />
          </div>
          <p className="truncate text-[10px] leading-tight text-zinc-500">
            {[stay.guest_phone, stay.guest_email].filter(Boolean).join(" · ") ||
              labels.noContact}
          </p>
        </div>
        <span
          className={[
            "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide leading-none",
            isCancelled
              ? "border-red-300 bg-red-100 text-red-900"
              : isConfirmed
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-900",
          ].join(" ")}
        >
          {isCancelled
            ? labels.statusCancelled
            : isConfirmed
              ? labels.statusConfirmed
              : labels.statusRequest}
        </span>
      </div>

      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-zinc-600">
        <span className="font-medium text-zinc-700">
          {formatStayPeriod(stay.check_in, stay.check_out)}
        </span>
        <span aria-hidden>·</span>
        <span>{labels.guestsShort(stay.num_adults, stay.num_children)}</span>
        {(stay.room_names?.length ?? 0) > 0 ? (
          <span className="rounded bg-zinc-100 px-1 py-0.5 text-[9px]">
            {(stay.room_names ?? []).join(", ")}
          </span>
        ) : (
          <span className="rounded bg-zinc-100 px-1 py-0.5 text-[9px]">
            {labels.noRoom}
          </span>
        )}
        {isConfirmed && stay.total_price != null ? (
          <span className="rounded bg-emerald-50 px-1 py-0.5 text-[9px] text-emerald-800">
            {stay.total_price} RON
          </span>
        ) : null}
        <span className="font-mono text-[9px] text-zinc-400">
          {formatBookingRef(stay.id)}
        </span>
      </div>

      {stay.guest_profile ? (
        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[9px] text-zinc-500">
          <span className="inline-flex items-center gap-0.5 rounded bg-zinc-100 px-1 py-0.5">
            {labels.starsShort}: {stay.guest_profile.stars_avg.toFixed(1)}
            <GuestScoreHint />
          </span>
          {stay.guest_alert_note ? (
            <span className="truncate rounded bg-amber-50 px-1 py-0.5 text-amber-900">
              {stay.guest_alert_note}
            </span>
          ) : null}
        </div>
      ) : null}

      {stay.guest_id && (
        <Link
          href={`/admin/guests/${stay.guest_id}`}
          className="mt-0.5 inline-block text-[10px] font-bold text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
        >
          {labels.openClientProfile}
        </Link>
      )}

      {isConfirmed &&
      roomProgress &&
      operativeToday &&
      shouldShowRoomCheckinProgress(
        stay.check_in,
        operativeToday,
        roomProgress,
      ) ? (
        <StayCheckinProgress
          roomNames={stay.room_names ?? []}
          checkedInRooms={checkedInRooms}
          keysHandedRooms={keysHandedRooms}
          roomIdVerified={roomIdVerified}
          isConfirmed={isConfirmed}
          progressTitle={labels.checkinRoomsProgress(
            roomProgress.checked,
            roomProgress.total,
          )}
          labels={{
            roomChecked: labels.checkinRoomChecked,
            roomPending: labels.checkinRoomPending,
            roomKeyHanded: labels.checkinRoomKeyHanded,
            roomIdVerified: labels.checkinRoomIdVerified,
            roomIdMissing: labels.checkinRoomIdMissing,
            allRoomsDone: labels.checkinAllRoomsDone,
            partialHint: labels.checkinPartialHint,
          }}
        />
      ) : null}
    </div>
  );
}
