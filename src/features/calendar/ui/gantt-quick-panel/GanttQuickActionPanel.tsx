"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
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
} from "@/features/calendar/actions";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import {
  BLOCK_REASON_PRESETS,
  resolveBlockReason,
  type BlockReasonPresetId,
} from "@/domain/gantt/block-reasons";
import { showGanttCreateUndoToast } from "@/features/calendar/ui/gantt-create-undo";
import {
  publishGanttHoldOrBlock,
  publishGanttLiveBooking,
  removeGanttLiveBooking,
} from "@/lib/gantt/live-bookings";
import { remapBookingRoom } from "@/domain/gantt/live-occupancy";
import { buildSyntheticGanttBookingRow } from "@/services/bookings/synthetic-gantt-row";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput, AdminSelect } from "@/components/admin/ui/AdminInput";
import { formatStayPeriod } from "@/lib/ro-calendar";
import {
  addDays,
  clampCheckInDate,
  minCheckOutDate,
  parseIso,
  todayIso,
} from "@/lib/stay-dates";
import { BookingIdentityPanel, useBookingIdentity } from "@/features/bookings/ui/identity";

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
  today?: string;
};

const labelClass =
  "admin-field__label block uppercase tracking-[0.08em]";

const LIST_SEPARATOR = "\u00B7";

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
      ? "admin-banner--warning"
      : tone === "info"
        ? "admin-banner--info"
        : "admin-banner--muted";

  return (
    <div className={["admin-banner", toneClass].join(" ")}>
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
  minCheckIn,
  invalidInterval,
  hasConflict,
  invalidMessage,
  nightLabel,
  locale,
  tGantt,
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
  minCheckIn: string;
  invalidInterval: boolean;
  hasConflict: boolean;
  invalidMessage: string;
  nightLabel: (count: number) => string;
  locale: string;
  tGantt: (key: string) => string;
}) {
  const nights =
    checkIn && checkOut && !invalidInterval ? nightsBetween(checkIn, checkOut) : 0;
  const period =
    checkIn && checkOut && !invalidInterval
      ? formatStayPeriod(checkIn, checkOut, locale, true)
      : invalidMessage;

  return (
    <section className="admin-surface-card gantt-quick-panel__planner p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="gantt-quick-panel__eyebrow text-[11px] font-semibold uppercase tracking-[0.14em]">
            {title}
          </p>
          <div className="gantt-quick-panel__value mt-1 text-base font-bold">{subtitle}</div>
          <p
            className={[
              "mt-1 text-sm",
              invalidInterval ? "admin-text--danger" : "gantt-quick-panel__muted",
            ].join(" ")}
          >
            {period}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="admin-status-badge admin-status-badge--confirmed px-3 py-1 text-[11px]">
            {nights > 0 ? nightLabel(nights) : tGantt("quick.intervalBadge")}
          </span>
          {hasConflict ? (
            <span className="admin-status-badge admin-status-badge--pending px-3 py-1 text-[11px]">
              {tGantt("quick.conflict")}
            </span>
          ) : null}
          {invalidInterval ? (
            <span className="admin-status-badge admin-status-badge--cancelled px-3 py-1 text-[11px]">
              {tGantt("quick.invalidDates")}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          {tGantt("quick.checkInLabel")}
          <AdminInput
            type="date"
            className="mt-1"
            value={checkIn}
            min={minCheckIn}
            onChange={(e) => onCheckInChange(e.target.value)}
          />
        </label>
        <label className={labelClass}>
          {tGantt("quick.checkOutLabel")}
          <AdminInput
            type="date"
            className="mt-1"
            value={checkOut}
            min={checkIn ? minCheckOutDate(checkIn, minCheckIn) : minCheckIn}
            onChange={(e) => onCheckOutChange(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <AdminButton variant="soft" size="sm" onClick={() => onShift(-7)}>
          {tGantt("quick.shiftMinus7")}
        </AdminButton>
        <AdminButton variant="soft" size="sm" onClick={() => onShift(-1)}>
          {tGantt("quick.shiftMinus1")}
        </AdminButton>
        <AdminButton variant="soft" size="sm" onClick={() => onShift(1)}>
          {tGantt("quick.shiftPlus1")}
        </AdminButton>
        <AdminButton variant="soft" size="sm" onClick={() => onShift(7)}>
          {tGantt("quick.shiftPlus7")}
        </AdminButton>
        <AdminButton variant="soft" size="sm" onClick={onToday}>
          {tGantt("quick.todayButton")}
        </AdminButton>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {[1, 2, 3, 7].map((value) => (
          <AdminButton
            key={value}
            variant="soft"
            size="sm"
            onClick={() => onSetDuration(value)}
          >
            {nightLabel(value)}
          </AdminButton>
        ))}
      </div>
    </section>
  );
}

function ActionGrid({
  disabled,
  onSelect,
  tGantt,
}: {
  disabled: {
    hold: boolean;
    block: boolean;
    cerere: boolean;
    direct: boolean;
  };
  onSelect: (mode: "hold" | "block" | "cerere" | "direct") => void;
  tGantt: (key: string) => string;
}) {
  const actions = [
    {
      id: "cerere",
      label: tGantt("quick.radial.request"),
      hint: tGantt("quick.radial.unconfirmed"),
      tone: "cerere",
    },
    {
      id: "direct",
      label: tGantt("quick.radial.direct"),
      hint: tGantt("quick.radial.confirmed"),
      tone: "direct",
    },
    {
      id: "hold",
      label: tGantt("quick.radial.hold"),
      hint: tGantt("quick.radial.temporary"),
      tone: "hold",
    },
    {
      id: "block",
      label: tGantt("quick.radial.block"),
      hint: tGantt("quick.radial.unavailable"),
      tone: "block",
    },
  ] as const;

  return (
    <div>
      <div className="gantt-quick-panel__pick-heading">
        <p className="gantt-quick-panel__eyebrow text-[11px] font-semibold uppercase tracking-[0.18em]">
          {tGantt("quick.radial.release")}
        </p>
        <p className="gantt-quick-panel__pick-title text-base font-extrabold">
          {tGantt("quick.radial.choose")}
        </p>
      </div>

      <div className="gantt-quick-panel__action-grid">
        {actions.map((action) => {
          const isDisabled = disabled[action.id];
          return (
            <button
              key={action.id}
              type="button"
              disabled={isDisabled}
              aria-disabled={isDisabled}
              onClick={() => onSelect(action.id)}
              className={[
                "admin-surface-card admin-surface-card--interactive admin-booking-tone",
                `admin-booking-tone--${action.tone}`,
                "gantt-quick-panel__action-card",
                isDisabled && "gantt-quick-panel__action-card--disabled",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="gantt-quick-panel__action-card-label">
                {action.label}
              </span>
              <span className="gantt-quick-panel__action-card-hint">
                {action.hint}
              </span>
            </button>
          );
        })}
      </div>
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
  today: todayProp,
}: Props) {
  const tCommon = useTranslations("admin.common");
  const tGantt = useTranslations("admin.gantt");
  const locale = useLocale();
  const router = useRouter();
  const { showToast, notifyMoved } = useAdminFx();
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();
  const effectiveToday = todayProp ?? todayIso();

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
  const [reason, setReason] = useState("");
  const [expiresHours, setExpiresHours] = useState("");
  const [blockPreset, setBlockPreset] =
    useState<BlockReasonPresetId>("maintenance");
  const [blockCustom, setBlockCustom] = useState("");
  const identity = useBookingIdentity();
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
      ? formatStayPeriod(activeCheckIn, activeCheckOut, locale, true)
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
  }, [selectedBooking, moveSourceRoomId, moveTargetRoomId, rooms, locale, tGantt]);

  if (!mode) return null;

  function handleBack() {
    setError(null);
    onModeChange?.("pick");
  }

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

  function ensureCreatableInterval() {
    if (intervalInvalid) {
      setError(tGantt("quick.errors.checkoutAfterCheckin"));
      return false;
    }
    return true;
  }

  function submitHold() {
    if (!activeRoomId) {
      setError(tGantt("quick.errors.chooseRoom"));
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
            ? tGantt("quick.holdCreatedMany", { count: draft.roomIds.length })
            : tGantt("quick.holdCreated"),
          period,
          res.undo,
          {
            actionLabel: tGantt("quick.undoAction"),
            undoneTitle: tGantt("quick.undoneTitle"),
            undoneMessage: tGantt("quick.undoneMessage"),
          }
        );
      } else {
        showToast({ kind: "success", title: tGantt("quick.holdCreated"), message: period });
      }
      const holdIds = "ids" in res ? res.ids : [res.id];
      const holdRoomIds =
        draft?.roomIds && draft.roomIds.length > 1 ? draft.roomIds : [activeRoomId];
      publishGanttHoldOrBlock({
        ids: holdIds,
        kind: "hold",
        roomIds: holdRoomIds,
        checkIn: activeCheckIn,
        checkOut: activeCheckOut,
        reason,
        today: effectiveToday,
      });
      onClose();
    });
  }

  function submitBlock() {
    if (!activeRoomId) {
      setError(tGantt("quick.errors.chooseRoom"));
      return;
    }
    if (!ensureCreatableInterval()) return;
    const resolvedReason = resolveBlockReason(blockPreset, blockCustom);
    if (!resolvedReason) {
      setError(tGantt("quick.errors.blockReasonRequired"));
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
          tGantt("quick.blockCreated"),
          period,
          res.undo,
          {
            actionLabel: tGantt("quick.undoAction"),
            undoneTitle: tGantt("quick.undoneTitle"),
            undoneMessage: tGantt("quick.undoneMessage"),
          }
        );
      } else {
        showToast({ kind: "success", title: tGantt("quick.blockCreated"), message: period });
      }
      publishGanttHoldOrBlock({
        ids: [res.id],
        kind: "block",
        roomIds: [activeRoomId],
        checkIn: activeCheckIn,
        checkOut: activeCheckOut,
        reason: resolvedReason,
        today: effectiveToday,
      });
      onClose();
    });
  }

  function submitGuestCreate(kind: "cerere" | "direct") {
    if (!activeRoomId) {
      setError(tGantt("quick.errors.chooseRoom"));
      return;
    }
    if (!ensureCreatableInterval()) return;
    if (!identity.canSubmit) return;
    setError(null);
    const payload = {
      roomId: activeRoomId,
      roomName: activeRoom?.name ?? draft?.roomName,
      checkIn: activeCheckIn,
      checkOut: activeCheckOut,
      guestLastName: identity.guestLastName,
      guestFirstName: identity.guestFirstName,
      guestEmail: identity.guestEmail,
      guestPhone: identity.guestPhone,
    };
    const tempId = `optimistic:${crypto.randomUUID()}`;
    publishGanttLiveBooking(
      buildSyntheticGanttBookingRow({
        id: tempId,
        checkIn: payload.checkIn,
        checkOut: payload.checkOut,
        status: kind === "cerere" ? "cerere_noua" : "confirmata",
        guestLastName: payload.guestLastName,
        guestFirstName: payload.guestFirstName,
        guestEmail: payload.guestEmail,
        guestPhone: payload.guestPhone,
        roomId: payload.roomId,
        roomName: payload.roomName,
      }),
    );
    onClose();
    void (async () => {
      const res =
        kind === "cerere"
          ? await createCerereFromGanttAction(payload)
          : await createDirectStayFromGanttAction(payload);
      if (!res.ok) {
        removeGanttLiveBooking(tempId);
        showToast({ kind: "error", title: tCommon("error"), message: res.error });
        return;
      }
      removeGanttLiveBooking(tempId);
      if (res.booking) {
        publishGanttLiveBooking(res.booking);
      }
      showToast({
        kind: "success",
        title: kind === "cerere" ? tGantt("quick.requestCreated") : tGantt("quick.directCreated"),
        message:
          kind === "cerere"
            ? tGantt("quick.requestAppears")
            : tGantt("quick.bookingAppears"),
      });
    })();
  }

  function submitMove() {
    if (!selectedBooking || !moveSourceRoomId || !moveTargetRoomId) {
      setError(tGantt("quick.errors.chooseBookingAndTarget"));
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

  const titleMap: Record<GanttQuickPanelMode, string> = {
    pick: tGantt("quick.title.pick"),
    hold: tGantt("quick.title.hold"),
    block: tGantt("quick.title.block"),
    cerere: tGantt("quick.title.request"),
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
      title={titleMap[mode]}
      variant="modal"
      width={640}
      className={["gantt-quick-panel", pending && "gantt-quick-panel--busy"].filter(Boolean).join(" ")}
    >
      <div
        className="gantt-quick-panel__body gantt-toolbar-occ-form space-y-4 p-1"
        aria-busy={pending}
      >
        {mode !== "move" ? (
          <>
            {!draft ? (
              <label className={labelClass}>
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
              minCheckIn={effectiveToday}
              invalidInterval={intervalInvalid}
              hasConflict={hasConflict}
              invalidMessage={tGantt("quick.chooseCheckoutAfterCheckin")}
              nightLabel={(count) => tGantt("quick.nightsLabel", { count })}
              locale={locale}
              tGantt={tGantt}
            />

            {hasConflict ? (
              <SummaryCard
                title={tGantt("quick.conflict")}
                tone="warn"
                body={tGantt("quick.conflictBody")}
              />
            ) : null}

            {hasMultiRoomDraft ? (
              <SummaryCard
                title={tGantt("quick.note")}
                tone="info"
                body={tGantt("quick.multiRoomOnlyHold")}
              />
            ) : null}
          </>
        ) : null}

        {mode === "pick" ? (
          <ActionGrid
            disabled={{
              hold: hasConflict || intervalInvalid,
              block: hasConflict || hasMultiRoomDraft || intervalInvalid,
              cerere: hasConflict || hasMultiRoomDraft || intervalInvalid,
              direct: hasConflict || hasMultiRoomDraft || intervalInvalid,
            }}
            onSelect={(nextMode) => onModeChange?.(nextMode)}
            tGantt={tGantt}
          />
        ) : null}

        {mode === "hold" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                {tGantt("quick.reasonLabel")}
                <AdminInput
                  className="mt-1"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={tGantt("quick.holdReasonPlaceholder")}
                />
              </label>
              <label className={labelClass}>
                {tGantt("quick.expiresAfterLabel")}
                <AdminInput
                  type="number"
                  min={1}
                  className="mt-1"
                  value={expiresHours}
                  onChange={(e) => setExpiresHours(e.target.value)}
                  placeholder={tGantt("quick.hoursOptionalPlaceholder")}
                />
              </label>
            </div>
            <div className="gantt-quick-panel__actions flex gap-2">
              {allowBack ? (
                <AdminButton
                  variant="secondary"
                  size="sm"
                  className="gantt-quick-panel__action flex-1"
                  onClick={handleBack}
                >
                  {tGantt("quick.backToRadial")}
                </AdminButton>
              ) : null}
              <AdminButton
                variant="primary"
                size="sm"
                className="gantt-quick-panel__action gantt-quick-panel__action--primary flex-1"
                disabled={pending || !activeRoomId || hasConflict || intervalInvalid}
                onClick={submitHold}
              >
                {pending ? tCommon("saving") : tGantt("quick.createHold")}
              </AdminButton>
            </div>
          </>
        ) : null}

        {mode === "block" ? (
          <>
            <label className={labelClass}>
              {tGantt("quick.blockReasonLabel")}
              <AdminSelect
                className="mt-1"
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
              </AdminSelect>
            </label>
            {blockPreset === "other" || blockCustom ? (
              <label className={labelClass}>
                {tGantt("quick.detailsLabel")}
                <AdminInput
                  className="mt-1"
                  value={blockCustom}
                  onChange={(e) => setBlockCustom(e.target.value)}
                  placeholder={tGantt("quick.shortDescription")}
                />
              </label>
            ) : null}
            <div className="gantt-quick-panel__actions flex gap-2">
              {allowBack ? (
                <AdminButton
                  variant="secondary"
                  size="sm"
                  className="gantt-quick-panel__action flex-1"
                  onClick={handleBack}
                >
                  {tGantt("quick.backToRadial")}
                </AdminButton>
              ) : null}
              <AdminButton
                variant="primary"
                size="sm"
                className="gantt-quick-panel__action gantt-quick-panel__action--primary flex-1"
                disabled={
                  pending ||
                  !activeRoomId ||
                  hasConflict ||
                  hasMultiRoomDraft ||
                  intervalInvalid
                }
                onClick={submitBlock}
              >
                {pending ? tCommon("saving") : tGantt("quick.createBlock")}
              </AdminButton>
            </div>
          </>
        ) : null}

        {mode === "cerere" || mode === "direct" ? (
          <>
            <BookingIdentityPanel identity={identity} appearance="admin" />
            <div className="gantt-quick-panel__actions flex gap-2">
              {allowBack ? (
                <AdminButton
                  variant="secondary"
                  size="sm"
                  className="gantt-quick-panel__action flex-1"
                  onClick={handleBack}
                >
                  {tGantt("quick.backToRadial")}
                </AdminButton>
              ) : null}
              <AdminButton
                variant="primary"
                size="sm"
                className="gantt-quick-panel__action gantt-quick-panel__action--primary flex-1"
                disabled={
                  pending ||
                  !identity.canSubmit ||
                  !activeRoomId ||
                  hasConflict ||
                  hasMultiRoomDraft ||
                  intervalInvalid
                }
                onClick={() => submitGuestCreate(mode)}
              >
                {pending
                  ? tCommon("saving")
                  : !identity.identityChecksReady
                    ? identity.checkingLabel
                    : mode === "cerere"
                      ? tGantt("quick.createRequest")
                      : tGantt("quick.confirmStay")}
              </AdminButton>
            </div>
          </>
        ) : null}

        {mode === "move" ? (
          <>
            <label className={labelClass}>
              {tGantt("quick.confirmedBookingLabel")}
              <AdminSelect
                className="mt-1"
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
                  <label className={labelClass}>
                    {tGantt("quick.fromRoomLabel")}
                    <AdminSelect
                      className="mt-1"
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
                    </AdminSelect>
                  </label>
                  <label className={labelClass}>
                    {tGantt("quick.toRoomLabel")}
                    <AdminSelect
                      className="mt-1"
                      value={moveTargetRoomId}
                      onChange={(e) => {
                        setError(null);
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
