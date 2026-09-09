"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminSelect } from "@/components/admin/ui/AdminInput";
import {
  BookingIdentityPanel,
  useBookingIdentity,
} from "@/features/bookings/ui/identity";
import { occupantRoomOptionLabel } from "@/features/calendar/ui/gantt-quick-panel/occupant-room-option";

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
  initial,
  onChange,
}: {
  roomId: string;
  initial?: OccupantIdentityValue;
  onChange: (value: OccupantIdentityValue) => void;
}) {
  const identity = useBookingIdentity(
    initial
      ? {
          initialValues: {
            lastName: initial.guestLastName,
            firstName: initial.guestFirstName,
            email: initial.guestEmail,
            phone: initial.guestPhone,
          },
          initialSettled: initial.canSubmit,
        }
      : undefined,
  );

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
  const t = useTranslations("admin.gantt.quick");
  const [activeRoomId, setActiveRoomId] = useState(rooms[0]?.id ?? "");
  const [byRoom, setByRoom] = useState<Record<string, OccupantIdentityValue>>(
    {},
  );

  const handleChange = useCallback((value: OccupantIdentityValue) => {
    setByRoom((prev) => ({ ...prev, [value.roomId]: value }));
  }, []);

  useEffect(() => {
    if (rooms.length === 0) return;
    if (!rooms.some((room) => room.id === activeRoomId)) {
      setActiveRoomId(rooms[0].id);
    }
  }, [rooms, activeRoomId]);

  useEffect(() => {
    const values = rooms
      .map((room) => byRoom[room.id])
      .filter((value): value is OccupantIdentityValue => Boolean(value));
    const allReady =
      rooms.length > 0 && rooms.every((room) => byRoom[room.id]?.canSubmit);
    onValuesChange(values, allReady);
  }, [byRoom, rooms, onValuesChange]);

  const activeIndex = Math.max(
    0,
    rooms.findIndex((room) => room.id === activeRoomId),
  );
  const readyCount = rooms.filter((room) => byRoom[room.id]?.canSubmit).length;
  const titularLabel = t("occupantTitular");
  const incompleteLabel = t("occupantIncomplete");

  return (
    <div className="gantt-quick-panel__occupants">
      <div className="gantt-quick-panel__occupant-picker-head">
        <p className="gantt-quick-panel__occupant-picker-label">
          {t("occupantRoom")}
        </p>
        <p className="gantt-quick-panel__occupant-progress">
          {t("occupantProgress", { ready: readyCount, total: rooms.length })}
        </p>
      </div>
      <div className="gantt-quick-panel__occupant-picker">
        <AdminSelect
          fieldSize="sm"
          className="gantt-quick-panel__occupant-select"
          value={activeRoomId}
          onChange={(e) => setActiveRoomId(e.target.value)}
          aria-label={t("occupantRoom")}
        >
          {rooms.map((room, index) => {
            const value = byRoom[room.id];
            return (
              <option key={room.id} value={room.id}>
                {occupantRoomOptionLabel({
                  roomName: room.name,
                  isTitular: index === 0,
                  titularLabel,
                  lastName: value?.guestLastName,
                  firstName: value?.guestFirstName,
                  incompleteLabel,
                })}
              </option>
            );
          })}
        </AdminSelect>
        <AdminButton
          variant="secondary"
          size="sm"
          iconOnly
          className="gantt-quick-panel__occupant-nav"
          disabled={activeIndex <= 0}
          onClick={() => setActiveRoomId(rooms[activeIndex - 1]?.id ?? "")}
          aria-label={t("occupantPrev")}
        >
          ‹
        </AdminButton>
        <AdminButton
          variant="secondary"
          size="sm"
          iconOnly
          className="gantt-quick-panel__occupant-nav"
          disabled={activeIndex >= rooms.length - 1}
          onClick={() => setActiveRoomId(rooms[activeIndex + 1]?.id ?? "")}
          aria-label={t("occupantNext")}
        >
          ›
        </AdminButton>
      </div>
      {activeRoomId ? (
        <OccupantSlot
          key={activeRoomId}
          roomId={activeRoomId}
          initial={byRoom[activeRoomId]}
          onChange={handleChange}
        />
      ) : null}
    </div>
  );
}
