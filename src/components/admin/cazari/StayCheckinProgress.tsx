"use client";

import { computeRoomCheckinProgress } from "@/domain/checkin/room-checkin-progress";

type Labels = {
  roomChecked: string;
  roomPending: string;
  roomKeyHanded: string;
  allRoomsDone: string;
  partialHint: string;
};

type Props = {
  roomNames: string[];
  checkedInRooms: string[];
  keysHandedRooms?: string[];
  isConfirmed: boolean;
  /** Titlu progres (ex. „2 din 4 camere primite”) — rezolvat pe server. */
  progressTitle?: string;
  labels: Labels;
};

export function StayCheckinProgress({
  roomNames,
  checkedInRooms,
  keysHandedRooms = [],
  isConfirmed,
  progressTitle,
  labels,
}: Props) {
  if (!isConfirmed) return null;

  const progress = computeRoomCheckinProgress(roomNames, checkedInRooms);
  if (!progress.isMultiRoom && progress.checked === 0) return null;

  const pct =
    progress.total > 0
      ? Math.round((progress.checked / progress.total) * 100)
      : 0;

  const title = progress.isComplete
    ? labels.allRoomsDone
    : (progressTitle ?? `${progress.checked} / ${progress.total}`);

  return (
    <div
      className={[
        "stay-checkin-progress",
        progress.isComplete && "stay-checkin-progress--complete",
        progress.isPartial && "stay-checkin-progress--partial",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={title}
    >
      <div className="stay-checkin-progress__head">
        <span className="stay-checkin-progress__icon" aria-hidden>
          {progress.isComplete ? "✓" : "🔑"}
        </span>
        <div className="stay-checkin-progress__meta">
          <p className="stay-checkin-progress__title">
            {title}
          </p>
          {progress.isPartial ? (
            <p className="stay-checkin-progress__hint">{labels.partialHint}</p>
          ) : null}
        </div>
        <span className="stay-checkin-progress__pct">{pct}%</span>
      </div>

      <div
        className="stay-checkin-progress__bar"
        role="progressbar"
        aria-valuenow={progress.checked}
        aria-valuemin={0}
        aria-valuemax={progress.total}
      >
        <span
          className="stay-checkin-progress__bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>

      {progress.isMultiRoom ? (
        <ul className="stay-checkin-progress__rooms">
          {progress.roomNames.map((room) => {
            const done = progress.checkedRooms.some(
              (r) => r.toLowerCase() === room.toLowerCase(),
            );
            const keyHanded = keysHandedRooms.some(
              (r) => r.toLowerCase() === room.toLowerCase(),
            );
            return (
              <li
                key={room}
                className={[
                  "stay-checkin-progress__room",
                  done && "stay-checkin-progress__room--done",
                  keyHanded && "stay-checkin-progress__room--keys",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="stay-checkin-progress__room-dot" aria-hidden />
                <span className="stay-checkin-progress__room-name">{room}</span>
                {keyHanded ? (
                  <span
                    className="stay-checkin-progress__room-key"
                    title={labels.roomKeyHanded}
                    aria-label={labels.roomKeyHanded}
                  >
                    🔑
                  </span>
                ) : null}
                <span className="stay-checkin-progress__room-status">
                  {done ? labels.roomChecked : labels.roomPending}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
