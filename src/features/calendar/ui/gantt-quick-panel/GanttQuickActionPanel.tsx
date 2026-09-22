"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAdminPending } from "@/components/admin/feedback/AdminPendingProvider";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminSelect } from "@/components/admin/ui/AdminInput";
import type { StaffStayIntent } from "@/features/bookings/staff-stay-actions";
import { formatStayPeriod } from "@/lib/ro-calendar";
import {
  addDays,
  clampCheckInDate,
  todayIso,
} from "@/lib/stay-dates";
import { BlockBody } from "./BlockBody";
import { HoldBody } from "./HoldBody";
import { MoveBody } from "./MoveBody";
import { StayBody } from "./StayBody";
import {
  IntervalPlanner,
  LIST_SEPARATOR,
  StaySummary,
  SummaryCard,
  nightsBetween,
} from "./shared";
import {
  GANTT_QUICK_LABEL_CLASS,
  type GanttQuickActionPanelProps,
  type GanttQuickPanelMode,
} from "./types";

export function GanttQuickActionPanel({
  mode,
  rooms,
  bookings = [],
  draft = null,
  onClose,
  today: todayProp,
}: GanttQuickActionPanelProps) {
  const tCommon = useTranslations("admin.common");
  const tGantt = useTranslations("admin.gantt");
  const locale = useLocale();
  const { pending } = useAdminPending();
  const effectiveToday = todayProp ?? todayIso();

  const defaultRoomId = rooms[0]?.id ?? "";
  const [roomId, setRoomId] = useState(draft?.roomId ?? defaultRoomId);
  const [checkIn, setCheckIn] = useState(() =>
    clampCheckInDate(draft?.checkIn ?? effectiveToday, effectiveToday)
  );
  const [checkOut, setCheckOut] = useState(() => {
    const nextCheckIn = clampCheckInDate(
      draft?.checkIn ?? effectiveToday,
      effectiveToday
    );
    const nextCheckOut = draft?.checkOut ?? addDays(nextCheckIn, 1);
    return nextCheckOut <= nextCheckIn ? addDays(nextCheckIn, 1) : nextCheckOut;
  });
  const [error, setError] = useState<string | null>(null);
  const isStayMode = mode === "request" || mode === "direct";
  const [stayIntent, setStayIntent] = useState<StaffStayIntent>(
    mode === "direct" ? "direct" : "request",
  );
  useEffect(() => {
    if (mode === "request" || mode === "direct") setStayIntent(mode);
  }, [mode]);

  const activeRoomId = roomId;
  const activeCheckIn = checkIn;
  const activeCheckOut = checkOut;
  const activeRoom =
    rooms.find((room) => room.id === activeRoomId) ??
    (draft
      ? { id: draft.roomId, name: draft.roomName, building_name: "" }
      : null);
  const period =
    activeCheckIn && activeCheckOut && activeCheckIn < activeCheckOut
      ? formatStayPeriod(activeCheckIn, activeCheckOut, locale, true)
      : "";
  const multiRoomCount = draft?.roomIds?.length ?? 0;
  const hasMultiRoomDraft = multiRoomCount > 1;
  const intervalInvalid =
    !activeCheckIn || !activeCheckOut || activeCheckIn >= activeCheckOut;
  const preferredRoomIds = useMemo(
    () =>
      draft?.roomIds && draft.roomIds.length > 0
        ? draft.roomIds
        : draft?.roomId
          ? [draft.roomId]
          : [],
    [draft],
  );
  const activeRoomIds = draft?.roomIds?.length
    ? draft.roomIds
    : activeRoomId
      ? [activeRoomId]
      : [];
  const hasConflict =
    !intervalInvalid &&
    activeRoomIds.length > 0 &&
    bookings.some(
      (booking) =>
        booking.status !== "anulata" &&
        booking.room_ids.some((id) => activeRoomIds.includes(id)) &&
        booking.check_in < activeCheckOut &&
        booking.check_out > activeCheckIn
    );

  if (!mode) return null;

  function updateCheckIn(nextCheckIn: string) {
    setError(null);
    const clamped = clampCheckInDate(nextCheckIn, effectiveToday);
    setCheckIn(clamped);
    if (!activeCheckOut || clamped >= activeCheckOut) {
      setCheckOut(addDays(clamped, 1));
    }
  }

  function updateCheckOut(nextCheckOut: string) {
    setError(null);
    setCheckOut(nextCheckOut);
  }

  function shiftInterval(days: number) {
    setError(null);
    const duration =
      activeCheckIn && activeCheckOut && activeCheckIn < activeCheckOut
        ? nightsBetween(activeCheckIn, activeCheckOut)
        : 1;
    const nextCheckIn = clampCheckInDate(
      addDays(activeCheckIn, days),
      effectiveToday
    );
    setCheckIn(nextCheckIn);
    setCheckOut(addDays(nextCheckIn, Math.max(1, duration)));
  }

  function setIntervalDuration(nights: number) {
    setError(null);
    setCheckOut(addDays(activeCheckIn || effectiveToday, nights));
  }

  function moveIntervalToToday() {
    const duration =
      activeCheckIn && activeCheckOut && activeCheckIn < activeCheckOut
        ? nightsBetween(activeCheckIn, activeCheckOut)
        : 1;
    setError(null);
    setCheckIn(effectiveToday);
    setCheckOut(addDays(effectiveToday, Math.max(1, duration)));
  }

  const titleMap: Record<GanttQuickPanelMode, string> = {
    hold: tGantt("quick.title.hold"),
    block: tGantt("quick.title.block"),
    request: tGantt("quick.title.request"),
    direct: tGantt("quick.title.direct"),
    move: tGantt("quick.title.move"),
  };
  const intervalTitle = draft
    ? hasMultiRoomDraft
      ? tGantt("quick.multiRoomSelection")
      : tGantt("quick.selectedInterval")
    : tGantt("quick.bookingInterval");
  const intervalSubtitle = draft ? (
    <>
      <strong className="font-semibold text-zinc-900">
        {hasMultiRoomDraft
          ? tGantt("quick.multiRoomSelected", { count: multiRoomCount })
          : activeRoom?.name ?? draft.roomName}
      </strong>
      {!hasMultiRoomDraft && activeRoom?.building_name ? (
        <span className="text-zinc-500">
          {" "}
          {LIST_SEPARATOR} {activeRoom.building_name}
        </span>
      ) : null}
    </>
  ) : (
    <>
        <strong className="font-semibold text-zinc-900">{activeRoom?.name ?? tGantt("quick.chooseRoom")}</strong>
      {activeRoom?.building_name ? (
        <span className="text-zinc-500">
          {" "}
          {LIST_SEPARATOR} {activeRoom.building_name}
        </span>
      ) : null}
    </>
  );

  return (
    <AdminFloatingPanel
      open
      onClose={onClose}
      title={isStayMode ? titleMap[stayIntent] : titleMap[mode]}
      variant="modal"
      width={640}
      className={["gantt-quick-panel", pending && "gantt-quick-panel--busy"].filter(Boolean).join(" ")}
    >
      <div
        className="gantt-quick-panel__body gantt-toolbar-occ-form gantt-quick-panel__actions space-y-4 p-1"
        aria-busy={pending}
      >
        {mode !== "move" ? (
          <>
            {!draft && !isStayMode ? (
              <label className={GANTT_QUICK_LABEL_CLASS}>
                {tCommon("room")}
                <AdminSelect
                  className="mt-1"
                  value={roomId}
                  onChange={(e) => {
                    setError(null);
                    setRoomId(e.target.value);
                  }}
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} {LIST_SEPARATOR} {room.building_name}
                    </option>
                  ))}
                </AdminSelect>
              </label>
            ) : null}

            {draft ? (
              <StaySummary
                roomLabel={intervalSubtitle}
                period={period}
                nights={
                  intervalInvalid
                    ? 0
                    : nightsBetween(activeCheckIn, activeCheckOut)
                }
                nightLabel={(count) => tGantt("quick.nightsLabel", { count })}
              />
            ) : (
              <IntervalPlanner
                title={intervalTitle}
                subtitle={isStayMode ? tGantt("quick.stayIntervalHint") : intervalSubtitle}
                checkIn={activeCheckIn}
                checkOut={activeCheckOut}
                onCheckInChange={updateCheckIn}
                onCheckOutChange={updateCheckOut}
                onShift={shiftInterval}
                onSetDuration={setIntervalDuration}
                onToday={moveIntervalToToday}
                minCheckIn={effectiveToday}
                invalidInterval={intervalInvalid}
                hasConflict={!isStayMode && hasConflict}
                invalidMessage={tGantt("quick.chooseCheckoutAfterCheckin")}
                nightLabel={(count) => tGantt("quick.nightsLabel", { count })}
                locale={locale}
                tGantt={tGantt}
              />
            )}

            {hasConflict && !isStayMode ? (
              <SummaryCard
                title={tGantt("quick.conflict")}
                tone="warn"
                body={tGantt("quick.conflictBody")}
              />
            ) : null}

            {hasMultiRoomDraft && (mode === "hold") ? (
              <SummaryCard
                title={tGantt("quick.note")}
                tone="info"
                body={tGantt("quick.multiRoomHoldNote")}
              />
            ) : null}
          </>
        ) : null}

        {mode === "hold" ? (
          <HoldBody
            roomId={activeRoomId}
            checkIn={activeCheckIn}
            checkOut={activeCheckOut}
            draft={draft}
            hasConflict={hasConflict}
            intervalInvalid={intervalInvalid}
            pending={pending}
            today={effectiveToday}
            onClose={onClose}
            onError={setError}
          />
        ) : null}

        {mode === "block" ? (
          <BlockBody
            roomId={activeRoomId}
            checkIn={activeCheckIn}
            checkOut={activeCheckOut}
            draft={draft}
            hasConflict={hasConflict}
            intervalInvalid={intervalInvalid}
            pending={pending}
            today={effectiveToday}
            onClose={onClose}
            onError={setError}
          />
        ) : null}

        {mode === "request" || mode === "direct" ? (
          <StayBody
            mode={mode}
            checkIn={activeCheckIn}
            checkOut={activeCheckOut}
            preferredRoomIds={preferredRoomIds}
            rooms={rooms}
            draft={draft}
            intervalInvalid={intervalInvalid}
            pending={pending}
            onClose={onClose}
            onError={setError}
            onIntentChange={setStayIntent}
          />
        ) : null}

        {mode === "move" ? (
          <MoveBody
            rooms={rooms}
            bookings={bookings}
            pending={pending}
            onClose={onClose}
            onError={setError}
          />
        ) : null}

        {error ? (
          <p className="admin-banner admin-banner--danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="gantt-quick-panel__footer">
        <AdminButton
          variant="secondary"
          fullWidth
          className="gantt-quick-panel__cancel"
          onClick={onClose}
        >
          {tCommon("cancel")}
        </AdminButton>
      </div>
    </AdminFloatingPanel>
  );
}
