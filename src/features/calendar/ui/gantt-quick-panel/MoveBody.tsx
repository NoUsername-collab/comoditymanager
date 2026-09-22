"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminSelect } from "@/components/admin/ui/AdminInput";
import { remapBookingRoom } from "@/domain/gantt/live-occupancy";
import { previewRoomMoveAction, moveBookingRoomFromPivotAction } from "@/features/calendar/actions";
import { publishGanttLiveBooking } from "@/lib/gantt/live-bookings";
import { formatStayPeriod } from "@/lib/ro-calendar";
import type { BookingRow } from "@/services/bookings";
import { LIST_SEPARATOR, SummaryCard } from "./shared";
import {
  GANTT_QUICK_LABEL_CLASS,
  type GanttQuickRoomOption,
} from "./types";

export function MoveBody({
  rooms,
  bookings,
  pending,
  onClose,
  onError,
}: {
  rooms: GanttQuickRoomOption[];
  bookings: BookingRow[];
  pending: boolean;
  onClose: () => void;
  onError: (error: string | null) => void;
}) {
  const tCommon = useTranslations("admin.common");
  const tGantt = useTranslations("admin.gantt");
  const locale = useLocale();
  const { notifyMoved } = useAdminFx();
  const runAdminAction = useRunAdminAction();

  const confirmedBookings = useMemo(
    () =>
      bookings.filter(
        (booking) => booking.status === "confirmata" && booking.room_ids.length > 0
      ),
    [bookings]
  );

  const defaultBooking = confirmedBookings[0] ?? null;
  const [moveBookingId, setMoveBookingId] = useState(defaultBooking?.id ?? "");
  const [moveSourceRoomId, setMoveSourceRoomId] = useState(
    defaultBooking?.room_ids[0] ?? ""
  );
  const [moveTargetRoomId, setMoveTargetRoomId] = useState("");
  const [movePreviewState, setMovePreviewState] = useState<{
    key: string;
    text: string;
  } | null>(null);

  const selectedBooking = useMemo(
    () => confirmedBookings.find((booking) => booking.id === moveBookingId) ?? null,
    [confirmedBookings, moveBookingId]
  );

  const moveTargetOptions = useMemo(() => {
    if (!selectedBooking) return rooms;
    return rooms.filter((room) => !selectedBooking.room_ids.includes(room.id));
  }, [rooms, selectedBooking]);

  const movePreviewKey =
    selectedBooking && moveSourceRoomId && moveTargetRoomId
      ? `${selectedBooking.id}:${moveSourceRoomId}:${moveTargetRoomId}`
      : "";
  const movePreview =
    movePreviewState?.key === movePreviewKey ? movePreviewState.text : null;

  useEffect(() => {
    if (!selectedBooking || !moveSourceRoomId || !moveTargetRoomId) return;

    let cancelled = false;
    void previewRoomMoveAction({
      bookingId: selectedBooking.id,
      sourceRoomId: moveSourceRoomId,
      targetRoomId: moveTargetRoomId,
    }).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        onError(res.error);
        return;
      }
      onError(null);
      const sourceRoomName =
        rooms.find((room) => room.id === moveSourceRoomId)?.name ?? tGantt("quick.sourceRoom");
      const targetRoomName =
        rooms.find((room) => room.id === moveTargetRoomId)?.name ?? tGantt("quick.targetRoom");
      setMovePreviewState({
        key: `${selectedBooking.id}:${moveSourceRoomId}:${moveTargetRoomId}`,
        text:
          res.preview.mode === "full"
            ? tGantt("quick.movePreviewFull", {
                source: sourceRoomName,
                target: targetRoomName,
                period: formatStayPeriod(
                  res.preview.targetSegment.start,
                  res.preview.targetSegment.end,
                  locale,
                  true
                ),
                oldTotal: res.preview.oldTotal,
                newTotal: res.preview.newTotal,
              })
            : tGantt("quick.movePreviewSplit", {
                source: sourceRoomName,
                sourcePeriod: formatStayPeriod(
                  res.preview.sourceSegment?.start ?? "",
                  res.preview.sourceSegment?.end ?? "",
                  locale,
                  true
                ),
                target: targetRoomName,
                targetPeriod: formatStayPeriod(
                  res.preview.targetSegment.start,
                  res.preview.targetSegment.end,
                  locale,
                  true
                ),
                oldTotal: res.preview.oldTotal,
                newTotal: res.preview.newTotal,
              }),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [selectedBooking, moveSourceRoomId, moveTargetRoomId, rooms, locale, tGantt, onError]);

  function submitMove() {
    if (!selectedBooking || !moveSourceRoomId || !moveTargetRoomId) {
      onError(tGantt("quick.errors.chooseBookingAndTarget"));
      return;
    }
    onError(null);
    void runAdminAction(async () => {
      const res = await moveBookingRoomFromPivotAction({
        bookingId: selectedBooking.id,
        sourceRoomId: moveSourceRoomId,
        targetRoomId: moveTargetRoomId,
      });
      if (!res.ok) {
        onError(res.error);
        return;
      }
      notifyMoved(tGantt("moveRoom.moved"), selectedBooking.guest_name);
      const target = rooms.find((room) => room.id === moveTargetRoomId);
      publishGanttLiveBooking(
        remapBookingRoom(
          selectedBooking,
          moveSourceRoomId,
          moveTargetRoomId,
          target?.name ?? moveTargetRoomId,
        ),
      );
      onClose();
    });
  }

  return (
    <>
      <label className={GANTT_QUICK_LABEL_CLASS}>
        {tGantt("quick.confirmedBookingLabel")}
        <AdminSelect
          className="mt-1"
          value={moveBookingId}
          onChange={(e) => {
            const nextBookingId = e.target.value;
            const nextBooking =
              confirmedBookings.find((booking) => booking.id === nextBookingId) ??
              null;
            onError(null);
            setMoveBookingId(nextBookingId);
            setMoveSourceRoomId(nextBooking?.room_ids[0] ?? "");
            setMoveTargetRoomId("");
          }}
        >
          <option value="">{tCommon("selectPlaceholder")}</option>
          {confirmedBookings.map((booking) => (
            <option key={booking.id} value={booking.id}>
              {booking.guest_name} {LIST_SEPARATOR} {booking.room_names.join(", ")}
            </option>
          ))}
        </AdminSelect>
      </label>

      {confirmedBookings.length === 0 ? (
        <SummaryCard
          title={tGantt("quick.moveUnavailable")}
          body={tGantt("quick.moveUnavailableBody")}
        />
      ) : null}

      {selectedBooking ? (
        <>
          <SummaryCard
            title={tGantt("quick.selectedBooking")}
            body={
              <>
                <strong className="font-semibold text-zinc-900">
                  {selectedBooking.guest_name}
                </strong>
                <div className="mt-1">
                  {formatStayPeriod(
                    selectedBooking.check_in,
                    selectedBooking.check_out,
                    true
                  )}
                </div>
              </>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={GANTT_QUICK_LABEL_CLASS}>
              {tGantt("quick.fromRoomLabel")}
              <AdminSelect
                className="mt-1"
                value={moveSourceRoomId}
                onChange={(e) => {
                  onError(null);
                  setMoveSourceRoomId(e.target.value);
                }}
              >
                {selectedBooking.room_ids.map((id, index) => (
                  <option key={id} value={id}>
                    {selectedBooking.room_names[index] ?? id}
                  </option>
                ))}
              </AdminSelect>
            </label>
            <label className={GANTT_QUICK_LABEL_CLASS}>
              {tGantt("quick.toRoomLabel")}
              <AdminSelect
                className="mt-1"
                value={moveTargetRoomId}
                onChange={(e) => {
                  onError(null);
                  setMoveTargetRoomId(e.target.value);
                }}
              >
                <option value="">{tCommon("selectPlaceholder")}</option>
                {moveTargetOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} {LIST_SEPARATOR} {option.building_name}
                  </option>
                ))}
              </AdminSelect>
            </label>
          </div>
          {movePreview ? (
            <SummaryCard
              title={tGantt("quick.movePreviewTitle")}
              tone="info"
              body={movePreview}
            />
          ) : null}
          <AdminButton
            variant="primary"
            fullWidth
            className="gantt-quick-panel__action gantt-quick-panel__action--primary"
            disabled={pending || !moveTargetRoomId}
            onClick={submitMove}
          >
            {pending ? tCommon("saving") : tGantt("quick.confirmMove")}
          </AdminButton>
        </>
      ) : null}
    </>
  );
}
