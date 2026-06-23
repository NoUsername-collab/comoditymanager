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
                "stay-info__guest-name truncate text-[13px] font-bold leading-tight",
                isCancelled ? "stay-info__guest-name--cancelled" : "",
              ].join(" ")}
            >
              {stay.guest_name}
            </p>
            <GuestFlagPill flagLevel={stay.guest_alert_level} />
          </div>
          <p className="stay-info__contact truncate text-[10px] leading-tight">
            {[stay.guest_phone, stay.guest_email].filter(Boolean).join(" · ") ||
              labels.noContact}
          </p>
        </div>
        <span
          className={[
            "admin-status-badge",
            isCancelled
              ? "admin-status-badge--cancelled"
              : isConfirmed
                ? "admin-status-badge--confirmed"
                : "admin-status-badge--pending",
          ].join(" ")}
        >
          {isCancelled
            ? labels.statusCancelled
            : isConfirmed
              ? labels.statusConfirmed
              : labels.statusRequest}
        </span>
      </div>

      <div className="stay-info__meta mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px]">
        <span className="stay-info__meta-strong">
          {formatStayPeriod(stay.check_in, stay.check_out)}
        </span>
        <span aria-hidden>·</span>
        <span>{labels.guestsShort(stay.num_adults, stay.num_children)}</span>
        {(stay.room_names?.length ?? 0) > 0 ? (
          <span className="admin-semantic-pill admin-semantic-pill--muted">
            {(stay.room_names ?? []).join(", ")}
          </span>
        ) : (
          <span className="admin-semantic-pill admin-semantic-pill--muted">
            {labels.noRoom}
          </span>
        )}
        {isConfirmed && stay.total_price != null ? (
          <span className="admin-semantic-pill admin-semantic-pill--success">
            {stay.total_price} RON
          </span>
        ) : null}
        <span className="stay-info__ref text-[9px]">
          {formatBookingRef(stay.id)}
        </span>
      </div>

      {stay.guest_profile ? (
        <div className="stay-info__profile-meta mt-0.5 flex flex-wrap items-center gap-1 text-[9px]">
          <span className="stay-info__stars inline-flex items-center gap-0.5 rounded px-1 py-0.5">
            {labels.starsShort}: {stay.guest_profile.stars_avg.toFixed(1)}
            <GuestScoreHint />
          </span>
          {stay.guest_alert_note ? (
            <span className="admin-semantic-pill admin-semantic-pill--warning truncate">
              {stay.guest_alert_note}
            </span>
          ) : null}
        </div>
      ) : null}

      {stay.guest_id && (
        <Link
          href={`/admin/guests/${stay.guest_id}`}
          className="admin-text-link admin-text-link--accent mt-0.5 inline-block text-[10px]"
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
