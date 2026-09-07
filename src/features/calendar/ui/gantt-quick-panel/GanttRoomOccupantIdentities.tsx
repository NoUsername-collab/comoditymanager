"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookingIdentityPanel,
  useBookingIdentity,
} from "@/features/bookings/ui/identity";

export type OccupantIdentityValue = {
  roomId: string;
  guestLastName: string;
  guestFirstName: string;
  guestEmail: string;
  guestPhone: string;
  canSubmit: boolean;
};

function OccupantSlot({
  roomId,
  roomName,
  onChange,
}: {
  roomId: string;
  roomName: string;
  onChange: (value: OccupantIdentityValue) => void;
}) {
  const identity = useBookingIdentity();

  useEffect(() => {
    onChange({
      roomId,
      guestLastName: identity.guestLastName,
      guestFirstName: identity.guestFirstName,
      guestEmail: identity.guestEmail,
      guestPhone: identity.guestPhone,
      canSubmit: identity.canSubmit,
    });
  }, [
    roomId,
    identity.guestLastName,
    identity.guestFirstName,
    identity.guestEmail,
    identity.guestPhone,
    identity.canSubmit,
    onChange,
  ]);

  return (
    <section className="gantt-quick-panel__occupant">
      <p className="gantt-quick-panel__occupant-room">{roomName}</p>
      <BookingIdentityPanel identity={identity} appearance="admin" />
    </section>
  );
}

export function GanttRoomOccupantIdentities({
  rooms,
  onValuesChange,
}: {
  rooms: { id: string; name: string }[];
  onValuesChange: (values: OccupantIdentityValue[], allReady: boolean) => void;
}) {
  const [byRoom, setByRoom] = useState<Record<string, OccupantIdentityValue>>(
    {}
  );

  const handleChange = useCallback((value: OccupantIdentityValue) => {
    setByRoom((prev) => ({ ...prev, [value.roomId]: value }));
  }, []);

  useEffect(() => {
    const values = rooms
      .map((room) => byRoom[room.id])
      .filter((value): value is OccupantIdentityValue => Boolean(value));
    const allReady =
      rooms.length > 0 && rooms.every((room) => byRoom[room.id]?.canSubmit);
    onValuesChange(values, allReady);
  }, [byRoom, rooms, onValuesChange]);

  return (
    <div className="gantt-quick-panel__occupants">
      {rooms.map((room) => (
        <OccupantSlot
          key={room.id}
          roomId={room.id}
          roomName={room.name}
          onChange={handleChange}
        />
      ))}
    </div>
  );
}
