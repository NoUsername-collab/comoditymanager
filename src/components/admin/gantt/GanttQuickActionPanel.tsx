"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { BookingRow } from "@/services/bookings";
import {
  useAdminPending,
  useRunAdminAction,
} from "@/components/admin/feedback/AdminPendingProvider";
import {
  createCerereFromGanttAction,
  createDirectStayFromGanttAction,
  createRoomBlockFromGanttAction,
  createRoomHoldFromGanttAction,
  createRoomHoldsFromGanttAction,
  moveBookingRoomFromPivotAction,
  previewRoomMoveAction,
} from "@/app/admin/(panel)/calendar/actions";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import {
  BLOCK_REASON_PRESETS,
  resolveBlockReason,
  type BlockReasonPresetId,
} from "@/domain/gantt/block-reasons";
import { showGanttCreateUndoToast } from "@/components/admin/gantt/gantt-create-undo";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { addDays, parseIso, todayIso } from "@/lib/stay-dates";

export type GanttQuickRoomOption = {
  id: string;
  name: string;
  building_name: string;
};

export type GanttQuickCreateDraft = {
  roomId: string;
  roomIds?: string[];
  roomName: string;
  checkIn: string;
  checkOut: string;
  hasConflict: boolean;
  initialMode?: "hold" | "block" | "cerere" | "direct";
};

export type GanttQuickPanelMode =
  | "pick"
  | "hold"
  | "block"
  | "cerere"
  | "direct"
  | "move";

type Props = {
  mode: GanttQuickPanelMode | null;
  rooms: GanttQuickRoomOption[];
  bookings?: BookingRow[];
  draft?: GanttQuickCreateDraft | null;
  onClose: () => void;
  onModeChange?: (mode: GanttQuickPanelMode) => void;
};

const labelClass =
  "block text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500";
const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

const softButtonClass =
  "inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50";

function SummaryCard({
  title,
  body,
  tone = "default",
}: {
  title: string;
  body: ReactNode;
  tone?: "default" | "warn" | "info";
}) {
  const toneClass =
    tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "info"
        ? "border-sky-200 bg-sky-50 text-sky-900"
        : "border-zinc-200 bg-zinc-50 text-zinc-700";

  return (
    <div className={["rounded-2xl border px-4 py-3", toneClass].join(" ")}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-70">
        {title}
      </div>
      <div className="mt-1 text-sm font-medium">{body}</div>
    </div>
  );
}

function nightsBetween(checkIn: string, checkOut: string) {
  return Math.max(
    0,
    Math.round(
      (parseIso(checkOut).getTime() - parseIso(checkIn).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );
}

function IntervalPlanner({
  title,
  subtitle,
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  onShift,
  onSetDuration,
  onToday,
  invalidInterval,
  hasConflict,
}: {
  title: string;
  subtitle: ReactNode;
  checkIn: string;
  checkOut: string;
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
  onShift: (days: number) => void;
  onSetDuration: (nights: number) => void;
  onToday: () => void;
  invalidInterval: boolean;
  hasConflict: boolean;
}) {
  const nights =
    checkIn && checkOut && !invalidInterval ? nightsBetween(checkIn, checkOut) : 0;
  const period =
    checkIn && checkOut && !invalidInterval
      ? formatStayPeriod(checkIn, checkOut, true)
      : "Alege un check-out după check-in.";

  return (
    <section className="rounded-[1.65rem] border border-zinc-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(244,244,245,0.96))] p-4 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.45)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {title}
          </p>
          <div className="mt-1 text-base font-bold text-zinc-900">{subtitle}</div>
          <p
            className={[
              "mt-1 text-sm",
              invalidInterval ? "text-red-600" : "text-zinc-600",
            ].join(" ")}
          >
            {period}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-700">
            {nights > 0 ? `${nights} nopți` : "Interval"}
          </span>
          {hasConflict ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-amber-700">
              Conflict
            </span>
          ) : null}
          {invalidInterval ? (
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-red-700">
              Date invalide
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Check-in
          <input
            type="date"
            className={inputClass}
            value={checkIn}
            onChange={(e) => onCheckInChange(e.target.value)}
          />
        </label>
        <label className={labelClass}>
          Check-out
          <input
            type="date"
            className={inputClass}
            value={checkOut}
            onChange={(e) => onCheckOutChange(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={softButtonClass} onClick={() => onShift(-7)}>
          -7 zile
        </button>
        <button type="button" className={softButtonClass} onClick={() => onShift(-1)}>
          -1 zi
        </button>
        <button type="button" className={softButtonClass} onClick={() => onShift(1)}>
          +1 zi
        </button>
        <button type="button" className={softButtonClass} onClick={() => onShift(7)}>
          +7 zile
        </button>
        <button type="button" className={softButtonClass} onClick={onToday}>
          Azi
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {[1, 2, 3, 7].map((value) => (
          <button
            key={value}
            type="button"
            className={softButtonClass}
            onClick={() => onSetDuration(value)}
          >
            {value} {value === 1 ? "noapte" : "nopți"}
          </button>
        ))}
      </div>
    </section>
  );
}

function ActionRadial({
  disabled,
  onSelect,
}: {
  disabled: {
    hold: boolean;
    block: boolean;
    cerere: boolean;
    direct: boolean;
  };
  onSelect: (mode: "hold" | "block" | "cerere" | "direct") => void;
}) {
  const actions = [
    {
      id: "cerere",
      label: "Cerere nouă",
      hint: "neconfirmată",
      offsetX: -126,
      offsetY: -82,
      tone:
        "border-violet-300 bg-violet-50 text-violet-700 shadow-violet-100/80",
    },
    {
      id: "direct",
      label: "Cazare directă",
      hint: "confirmată",
      offsetX: 126,
      offsetY: -82,
      tone: "border-sky-300 bg-sky-50 text-sky-700 shadow-sky-100/80",
    },
    {
      id: "hold",
      label: "Hold",
      hint: "temporar",
      offsetX: -126,
      offsetY: 82,
      tone: "border-amber-300 bg-amber-50 text-amber-700 shadow-amber-100/80",
    },
    {
      id: "block",
      label: "Blocare",
      hint: "indisp.",
      offsetX: 126,
      offsetY: 82,
      tone: "border-zinc-300 bg-zinc-50 text-zinc-700 shadow-zinc-100/80",
    },
  ] as const;

  return (
    <div className="relative mx-auto h-[20rem] max-w-[30rem] overflow-visible">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200/70 bg-[radial-gradient(circle,rgba(236,253,245,0.9)_0%,rgba(255,255,255,0)_72%)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-zinc-200/80" />
      <div className="absolute left-1/2 top-1/2 z-20 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2rem] border border-emerald-200 bg-white/95 px-3 text-center shadow-[0_24px_60px_-24px_rgba(16,185,129,0.65)] backdrop-blur-sm">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Release
          </div>
          <div className="mt-1 text-base font-extrabold text-zinc-800">Alege</div>
        </div>
      </div>

      {actions.map((action) => {
        const isDisabled = disabled[action.id];
        return (
          <button
            key={action.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onSelect(action.id)}
            style={{
              left: "50%",
              top: "50%",
              transform: `translate(calc(-50% + ${action.offsetX}px), calc(-50% + ${action.offsetY}px))`,
            }}
            className={[
              "absolute z-10 flex min-h-[5.3rem] w-[10.5rem] flex-col items-center justify-center rounded-[1.55rem] border px-4 text-center shadow-[0_18px_45px_-24px_rgba(15,23,42,0.5)] transition",
              action.tone,
              isDisabled
                ? "cursor-not-allowed opacity-45 shadow-none"
                : "hover:scale-[1.02] hover:shadow-[0_24px_55px_-24px_rgba(15,23,42,0.5)]",
            ].join(" ")}
          >
            <span className="text-[1.03rem] font-extrabold leading-none">
              {action.label}
            </span>
            <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em] opacity-75">
              {action.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function GanttQuickActionPanel({
  mode,
  rooms,
  bookings = [],
  draft = null,
  onClose,
  onModeChange,
}: Props) {
  const router = useRouter();
  const { showToast, notifyMoved } = useAdminFx();
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();

  const confirmedBookings = useMemo(
    () =>
      bookings.filter(
        (booking) => booking.status === "confirmata" && booking.room_ids.length > 0
      ),
    [bookings]
  );

  const defaultRoomId = rooms[0]?.id ?? "";
  const defaultBooking = confirmedBookings[0] ?? null;
  const [roomId, setRoomId] = useState(draft?.roomId ?? defaultRoomId);
  const [checkIn, setCheckIn] = useState(draft?.checkIn ?? todayIso());
  const [checkOut, setCheckOut] = useState(
    draft?.checkOut ?? addDays(draft?.checkIn ?? todayIso(), 1)
  );
  const [reason, setReason] = useState("");
  const [expiresHours, setExpiresHours] = useState("");
  const [blockPreset, setBlockPreset] =
    useState<BlockReasonPresetId>("maintenance");
  const [blockCustom, setBlockCustom] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [moveBookingId, setMoveBookingId] = useState(defaultBooking?.id ?? "");
  const [moveSourceRoomId, setMoveSourceRoomId] = useState(
    defaultBooking?.room_ids[0] ?? ""
  );
  const [moveTargetRoomId, setMoveTargetRoomId] = useState("");
  const [movePreviewState, setMovePreviewState] = useState<{
    key: string;
    text: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      ? formatStayPeriod(activeCheckIn, activeCheckOut, true)
      : "";
  const multiRoomCount = draft?.roomIds?.length ?? 0;
  const hasMultiRoomDraft = multiRoomCount > 1;
  const intervalInvalid =
    !activeCheckIn || !activeCheckOut || activeCheckIn >= activeCheckOut;
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
  const allowBack = !!draft && !!onModeChange && mode !== "pick" && mode !== "move";

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
        setError(res.error);
        return;
      }
      setError(null);
      const sourceRoomName =
        rooms.find((room) => room.id === moveSourceRoomId)?.name ?? "camera sursă";
      const targetRoomName =
        rooms.find((room) => room.id === moveTargetRoomId)?.name ?? "camera țintă";
      setMovePreviewState({
        key: `${selectedBooking.id}:${moveSourceRoomId}:${moveTargetRoomId}`,
        text:
          res.preview.mode === "full"
            ? `${sourceRoomName} → ${targetRoomName}: ${formatStayPeriod(res.preview.targetSegment.start, res.preview.targetSegment.end, true)} · ` +
              `Total: ${res.preview.oldTotal} → ${res.preview.newTotal} RON`
            : `${sourceRoomName}: ${formatStayPeriod(res.preview.sourceSegment?.start ?? "", res.preview.sourceSegment?.end ?? "", true)} · ` +
              `→ ${targetRoomName}: ${formatStayPeriod(res.preview.targetSegment.start, res.preview.targetSegment.end, true)} · ` +
              `Total: ${res.preview.oldTotal} → ${res.preview.newTotal} RON`,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [selectedBooking, moveSourceRoomId, moveTargetRoomId, rooms]);

  if (!mode) return null;

  function handleBack() {
    setError(null);
    onModeChange?.("pick");
  }

  function updateCheckIn(nextCheckIn: string) {
    setError(null);
    setCheckIn(nextCheckIn);
    if (!activeCheckOut || nextCheckIn >= activeCheckOut) {
      setCheckOut(addDays(nextCheckIn, 1));
    }
  }

  function updateCheckOut(nextCheckOut: string) {
    setError(null);
    setCheckOut(nextCheckOut);
  }

  function shiftInterval(days: number) {
    setError(null);
    setCheckIn((current) => addDays(current, days));
    setCheckOut((current) => addDays(current, days));
  }

  function setIntervalDuration(nights: number) {
    setError(null);
    setCheckOut(addDays(activeCheckIn || todayIso(), nights));
  }

  function moveIntervalToToday() {
    const duration =
      activeCheckIn && activeCheckOut && activeCheckIn < activeCheckOut
        ? nightsBetween(activeCheckIn, activeCheckOut)
        : 1;
    const today = todayIso();
    setError(null);
    setCheckIn(today);
    setCheckOut(addDays(today, Math.max(1, duration)));
  }

  function ensureCreatableInterval() {
    if (intervalInvalid) {
      setError("Check-out trebuie să fie după check-in.");
      return false;
    }
    return true;
  }

  function submitHold() {
    if (!activeRoomId) {
      setError("Alege camera.");
      return;
    }
    if (!ensureCreatableInterval()) return;
    setError(null);
    void runAdminAction(async () => {
      const hours = expiresHours.trim() ? Number(expiresHours) : null;
      const res =
        draft?.roomIds && draft.roomIds.length > 1
          ? await createRoomHoldsFromGanttAction({
              roomIds: draft.roomIds,
              checkIn: activeCheckIn,
              checkOut: activeCheckOut,
              reason,
              expiresHours: hours,
            })
          : await createRoomHoldFromGanttAction({
              roomId: activeRoomId,
              checkIn: activeCheckIn,
              checkOut: activeCheckOut,
              reason,
              expiresHours: hours,
            });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      if (res.undo) {
        showGanttCreateUndoToast(
          showToast,
          router,
          draft?.roomIds && draft.roomIds.length > 1
            ? `Hold pe ${draft.roomIds.length} camere`
            : "Hold creat",
          period,
          res.undo
        );
      } else {
        showToast({ kind: "success", title: "Hold creat", message: period });
      }
      onClose();
      router.refresh();
    });
  }

  function submitBlock() {
    if (!activeRoomId) {
      setError("Alege camera.");
      return;
    }
    if (!ensureCreatableInterval()) return;
    const resolvedReason = resolveBlockReason(blockPreset, blockCustom);
    if (!resolvedReason) {
      setError("Motivul blocării este obligatoriu.");
      return;
    }
    setError(null);
    void runAdminAction(async () => {
      const res = await createRoomBlockFromGanttAction({
        roomId: activeRoomId,
        checkIn: activeCheckIn,
        checkOut: activeCheckOut,
        reason: resolvedReason,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.undo) {
        showGanttCreateUndoToast(
          showToast,
          router,
          "Blocare creată",
          period,
          res.undo
        );
      } else {
        showToast({ kind: "success", title: "Blocare creată", message: period });
      }
      onClose();
      router.refresh();
    });
  }

  function submitGuestCreate(kind: "cerere" | "direct") {
    if (!activeRoomId) {
      setError("Alege camera.");
      return;
    }
    if (!ensureCreatableInterval()) return;
    setError(null);
    void runAdminAction(async () => {
      const payload = {
        roomId: activeRoomId,
        checkIn: activeCheckIn,
        checkOut: activeCheckOut,
        guestLastName,
        guestFirstName,
        guestEmail,
        guestPhone,
      };
      const res =
        kind === "cerere"
          ? await createCerereFromGanttAction(payload)
          : await createDirectStayFromGanttAction(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      showToast({
        kind: "success",
        title: kind === "cerere" ? "Cerere creată" : "Cazare directă creată",
        message:
          kind === "cerere"
            ? "Cererea apare imediat în Gantt și în listă."
            : "Rezervarea apare imediat în Gantt.",
      });
      onClose();
      router.refresh();
    });
  }

  function submitMove() {
    if (!selectedBooking || !moveSourceRoomId || !moveTargetRoomId) {
      setError("Alege rezervarea și camera țintă.");
      return;
    }
    setError(null);
    void runAdminAction(async () => {
      const res = await moveBookingRoomFromPivotAction({
        bookingId: selectedBooking.id,
        sourceRoomId: moveSourceRoomId,
        targetRoomId: moveTargetRoomId,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      notifyMoved("Cameră mutată", selectedBooking.guest_name);
      onClose();
      router.refresh();
    });
  }

  const titleMap: Record<GanttQuickPanelMode, string> = {
    pick: "Alege acțiunea",
    hold: "Hold rapid",
    block: "Blocare rapidă",
    cerere: "Cerere nouă",
    direct: "Cazare directă",
    move: "Mută cameră",
  };
  const intervalTitle = draft
    ? hasMultiRoomDraft
      ? "Selecție multi-cameră"
      : "Interval selectat"
    : "Interval rezervare";
  const intervalSubtitle = draft ? (
    <>
      <strong className="font-semibold text-zinc-900">
        {hasMultiRoomDraft
          ? `${multiRoomCount} camere selectate`
          : activeRoom?.name ?? draft.roomName}
      </strong>
      {!hasMultiRoomDraft && activeRoom?.building_name ? (
        <span className="text-zinc-500"> · {activeRoom.building_name}</span>
      ) : null}
    </>
  ) : (
    <>
      <strong className="font-semibold text-zinc-900">
        {activeRoom?.name ?? "Alege camera"}
      </strong>
      {activeRoom?.building_name ? (
        <span className="text-zinc-500"> · {activeRoom.building_name}</span>
      ) : null}
    </>
  );

  return (
    <AdminFloatingPanel
      open
      onClose={onClose}
      title={titleMap[mode]}
      variant="modal"
      width={640}
    >
      <div className="gantt-toolbar-occ-form space-y-4 p-1">
        {mode !== "move" ? (
          <>
            {!draft ? (
              <label className={labelClass}>
                Cameră
                <select
                  className={inputClass}
                  value={roomId}
                  onChange={(e) => {
                    setError(null);
                    setRoomId(e.target.value);
                  }}
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} · {room.building_name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <IntervalPlanner
              title={intervalTitle}
              subtitle={intervalSubtitle}
              checkIn={activeCheckIn}
              checkOut={activeCheckOut}
              onCheckInChange={updateCheckIn}
              onCheckOutChange={updateCheckOut}
              onShift={shiftInterval}
              onSetDuration={setIntervalDuration}
              onToday={moveIntervalToToday}
              invalidInterval={intervalInvalid}
              hasConflict={hasConflict}
            />

            {hasConflict ? (
              <SummaryCard
                title="Conflict"
                tone="warn"
                body="Intervalul se suprapune peste o ocupare existentă. Mută perioada direct din panoul de sus."
              />
            ) : null}

            {hasMultiRoomDraft ? (
              <SummaryCard
                title="Notă"
                tone="info"
                body="Pe selecția multi-cameră putem crea doar hold rapid din acest panel."
              />
            ) : null}
          </>
        ) : null}

        {mode === "pick" ? (
          <ActionRadial
            disabled={{
              hold: hasConflict || intervalInvalid,
              block: hasConflict || hasMultiRoomDraft || intervalInvalid,
              cerere: hasConflict || hasMultiRoomDraft || intervalInvalid,
              direct: hasConflict || hasMultiRoomDraft || intervalInvalid,
            }}
            onSelect={(nextMode) => onModeChange?.(nextMode)}
          />
        ) : null}

        {mode === "hold" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                Motiv
                <input
                  className={inputClass}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex. se așteaptă confirmarea"
                />
              </label>
              <label className={labelClass}>
                Expiră după
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={expiresHours}
                  onChange={(e) => setExpiresHours(e.target.value)}
                  placeholder="ore, opțional"
                />
              </label>
            </div>
            <div className="flex gap-2">
              {allowBack ? (
                <button
                  type="button"
                  className="admin-floating-panel__btn flex-1"
                  onClick={handleBack}
                >
                  Înapoi la radial
                </button>
              ) : null}
              <button
                type="button"
                className="admin-floating-panel__btn admin-floating-panel__btn--primary flex-1"
                disabled={pending || !activeRoomId || hasConflict || intervalInvalid}
                onClick={submitHold}
              >
                Creează hold
              </button>
            </div>
          </>
        ) : null}

        {mode === "block" ? (
          <>
            <label className={labelClass}>
              Motiv blocare
              <select
                className={inputClass}
                value={blockPreset}
                onChange={(e) =>
                  setBlockPreset(e.target.value as BlockReasonPresetId)
                }
              >
                {BLOCK_REASON_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
            {blockPreset === "other" || blockCustom ? (
              <label className={labelClass}>
                Detalii
                <input
                  className={inputClass}
                  value={blockCustom}
                  onChange={(e) => setBlockCustom(e.target.value)}
                  placeholder="Descriere scurtă"
                />
              </label>
            ) : null}
            <div className="flex gap-2">
              {allowBack ? (
                <button
                  type="button"
                  className="admin-floating-panel__btn flex-1"
                  onClick={handleBack}
                >
                  Înapoi la radial
                </button>
              ) : null}
              <button
                type="button"
                className="admin-floating-panel__btn admin-floating-panel__btn--primary flex-1"
                disabled={
                  pending ||
                  !activeRoomId ||
                  hasConflict ||
                  hasMultiRoomDraft ||
                  intervalInvalid
                }
                onClick={submitBlock}
              >
                Creează blocarea
              </button>
            </div>
          </>
        ) : null}

        {mode === "cerere" || mode === "direct" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                Nume
                <input
                  className={inputClass}
                  value={guestLastName}
                  onChange={(e) => setGuestLastName(e.target.value)}
                />
              </label>
              <label className={labelClass}>
                Prenume
                <input
                  className={inputClass}
                  value={guestFirstName}
                  onChange={(e) => setGuestFirstName(e.target.value)}
                />
              </label>
            </div>
            <label className={labelClass}>
              Email
              <input
                type="email"
                className={inputClass}
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
              />
            </label>
            <label className={labelClass}>
              Telefon (opțional)
              <input
                className={inputClass}
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
              />
            </label>
            <div className="flex gap-2">
              {allowBack ? (
                <button
                  type="button"
                  className="admin-floating-panel__btn flex-1"
                  onClick={handleBack}
                >
                  Înapoi la radial
                </button>
              ) : null}
              <button
                type="button"
                className="admin-floating-panel__btn admin-floating-panel__btn--primary flex-1"
                disabled={
                  pending ||
                  !activeRoomId ||
                  hasConflict ||
                  hasMultiRoomDraft ||
                  intervalInvalid
                }
                onClick={() => submitGuestCreate(mode)}
              >
                {mode === "cerere" ? "Creează cererea" : "Confirmă cazarea"}
              </button>
            </div>
          </>
        ) : null}

        {mode === "move" ? (
          <>
            <label className={labelClass}>
              Rezervare confirmată
              <select
                className={inputClass}
                value={moveBookingId}
                onChange={(e) => {
                  const nextBookingId = e.target.value;
                  const nextBooking =
                    confirmedBookings.find((booking) => booking.id === nextBookingId) ??
                    null;
                  setError(null);
                  setMoveBookingId(nextBookingId);
                  setMoveSourceRoomId(nextBooking?.room_ids[0] ?? "");
                  setMoveTargetRoomId("");
                }}
              >
                <option value="">Selectează…</option>
                {confirmedBookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.guest_name} · {booking.room_names.join(", ")}
                  </option>
                ))}
              </select>
            </label>

            {confirmedBookings.length === 0 ? (
              <SummaryCard
                title="Mutare indisponibilă"
                body="Nu există încă rezervări confirmate cu camere alocate pentru mutare."
              />
            ) : null}

            {selectedBooking ? (
              <>
                <SummaryCard
                  title="Rezervare selectată"
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
                  <label className={labelClass}>
                    Din camera
                    <select
                      className={inputClass}
                      value={moveSourceRoomId}
                      onChange={(e) => {
                        setError(null);
                        setMoveSourceRoomId(e.target.value);
                      }}
                    >
                      {selectedBooking.room_ids.map((id, index) => (
                        <option key={id} value={id}>
                          {selectedBooking.room_names[index] ?? id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>
                    În camera
                    <select
                      className={inputClass}
                      value={moveTargetRoomId}
                      onChange={(e) => {
                        setError(null);
                        setMoveTargetRoomId(e.target.value);
                      }}
                    >
                      <option value="">Selectează…</option>
                      {moveTargetOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name} · {option.building_name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {movePreview ? (
                  <SummaryCard title="Preview mutare" tone="info" body={movePreview} />
                ) : null}
                <button
                  type="button"
                  className="admin-floating-panel__btn admin-floating-panel__btn--primary w-full"
                  disabled={pending || !moveTargetRoomId}
                  onClick={submitMove}
                >
                  Confirmă mutarea
                </button>
              </>
            ) : null}
          </>
        ) : null}

        {error ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <button
          type="button"
          className="admin-floating-panel__btn w-full"
          onClick={onClose}
        >
          Anulează
        </button>
      </div>
    </AdminFloatingPanel>
  );
}
