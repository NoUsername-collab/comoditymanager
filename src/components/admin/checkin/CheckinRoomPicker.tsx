"use client";

import type { RoomCheckinProgress } from "@/domain/checkin/room-checkin-progress";

type Props = {
  progress: RoomCheckinProgress;
  selectedRooms: string[];
  onToggleRoom: (room: string) => void;
  onSelectAll: () => void;
  onSelectOne: (room: string) => void;
  labels: {
    title: string;
    hint: string;
    selectAll: string;
    selectOne: string;
    continue: string;
    checkedBadge: string;
    pendingBadge: string;
  };
  onConfirm: () => void;
  canConfirm: boolean;
};

export function CheckinRoomPicker({
  progress,
  selectedRooms,
  onToggleRoom,
  onSelectAll,
  onSelectOne,
  labels,
  onConfirm,
  canConfirm,
}: Props) {
  return (
    <div className="checkin-room-picker">
      <header className="checkin-room-picker__head">
        <p className="checkin-room-picker__title">{labels.title}</p>
        <p className="checkin-room-picker__hint">{labels.hint}</p>
      </header>

      <div className="checkin-room-picker__actions">
        <button
          type="button"
          className="checkin-room-picker__action"
          onClick={onSelectAll}
        >
          {labels.selectAll}
        </button>
      </div>

      <ul className="checkin-room-picker__list">
        {progress.pendingRooms.map((room) => {
          const active = selectedRooms.some(
            (r) => r.toLowerCase() === room.toLowerCase(),
          );
          return (
            <li key={room}>
              <button
                type="button"
                className={[
                  "checkin-room-picker__card",
                  active && "checkin-room-picker__card--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onToggleRoom(room)}
              >
                <span className="checkin-room-picker__card-icon" aria-hidden>
                  🛏
                </span>
                <span className="checkin-room-picker__card-name">{room}</span>
                <span className="checkin-room-picker__card-badge">
                  {labels.pendingBadge}
                </span>
              </button>
              <button
                type="button"
                className="checkin-room-picker__solo"
                onClick={() => onSelectOne(room)}
              >
                {labels.selectOne}
              </button>
            </li>
          );
        })}
      </ul>

      {progress.checkedRooms.length > 0 ? (
        <div className="checkin-room-picker__done">
          <p className="checkin-room-picker__done-title">{labels.checkedBadge}</p>
          <ul className="checkin-room-picker__done-list">
            {progress.checkedRooms.map((room) => (
              <li key={room} className="checkin-room-picker__done-item">
                ✓ {room}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        className="checkin-stepper__btn checkin-stepper__btn--primary checkin-room-picker__confirm"
        disabled={!canConfirm}
        onClick={onConfirm}
      >
        {labels.continue}
      </button>
    </div>
  );
}
