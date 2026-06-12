"use client";

type Props = {
  rooms: string[];
  keysHandedRooms: string[];
  onToggleRoom: (room: string) => void;
  onToggleAll: (checked: boolean) => void;
  labels: {
    title: string;
    hint: string;
    selectAll: string;
    noneYet: string;
    partialHint: string;
  };
  disabled?: boolean;
};

function roomKey(room: string): string {
  return room.toLowerCase();
}

export function CheckinKeysHandoff({
  rooms,
  keysHandedRooms,
  onToggleRoom,
  onToggleAll,
  labels,
  disabled = false,
}: Props) {
  const allSelected =
    rooms.length > 0 &&
    rooms.every((room) =>
      keysHandedRooms.some((r) => roomKey(r) === roomKey(room)),
    );

  if (rooms.length === 0) return null;

  return (
    <section className="checkin-keys-handoff">
      <header className="checkin-keys-handoff__head">
        <p className="checkin-keys-handoff__title">{labels.title}</p>
        <p className="checkin-keys-handoff__hint">{labels.hint}</p>
      </header>

      {rooms.length > 1 ? (
        <label className="checkin-keys-handoff__all checkin-checkbox">
          <input
            type="checkbox"
            checked={allSelected}
            disabled={disabled}
            onChange={(e) => onToggleAll(e.target.checked)}
          />
          <span>{labels.selectAll}</span>
        </label>
      ) : null}

      <ul className="checkin-keys-handoff__list">
        {rooms.map((room) => {
          const checked = keysHandedRooms.some((r) => roomKey(r) === roomKey(room));
          return (
            <li key={room}>
              <label className="checkin-checkbox checkin-keys-handoff__item">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onToggleRoom(room)}
                />
                <span className="checkin-keys-handoff__room">{room}</span>
              </label>
            </li>
          );
        })}
      </ul>

      {keysHandedRooms.length === 0 ? (
        <p className="checkin-keys-handoff__note">{labels.noneYet}</p>
      ) : keysHandedRooms.length < rooms.length ? (
        <p className="checkin-keys-handoff__note checkin-keys-handoff__note--warn">
          {labels.partialHint}
        </p>
      ) : null}
    </section>
  );
}
