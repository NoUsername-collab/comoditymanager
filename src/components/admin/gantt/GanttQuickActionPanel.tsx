"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { suggestExistingGuestAction } from "@/app/[locale]/(public)/calendar/actions";
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
} from "@/app/[locale]/admin/(panel)/calendar/actions";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import {
  BLOCK_REASON_PRESETS,
  resolveBlockReason,
  type BlockReasonPresetId,
} from "@/domain/gantt/block-reasons";
import { showGanttCreateUndoToast } from "@/components/admin/gantt/gantt-create-undo";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import { formatStayPeriod } from "@/lib/ro-calendar";
import {
  addDays,
  clampCheckInDate,
  minCheckOutDate,
  parseIso,
  todayIso,
} from "@/lib/stay-dates";

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
    <div className={["rounded-xl border px-3 py-2.5", toneClass].join(" ")}>
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
}) {
  const nights =
    checkIn && checkOut && !invalidInterval ? nightsBetween(checkIn, checkOut) : 0;
  const period =
    checkIn && checkOut && !invalidInterval
      ? formatStayPeriod(checkIn, checkOut, locale, true)
      : invalidMessage;

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
            min={minCheckIn}
            onChange={(e) => onCheckInChange(e.target.value)}
          />
        </label>
        <label className={labelClass}>
          Check-out
          <input
            type="date"
            className={inputClass}
            value={checkOut}
            min={checkIn ? minCheckOutDate(checkIn, minCheckIn) : minCheckIn}
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
            {nightLabel(value)}
          </button>
        ))}
      </div>
    </section>
  );
}

function ActionRadial({
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
      offsetX: -126,
      offsetY: -82,
      tone:
        "border-violet-300 bg-violet-50 text-violet-700 shadow-violet-100/80",
    },
    {
      id: "direct",
      label: tGantt("quick.radial.direct"),
      hint: tGantt("quick.radial.confirmed"),
      offsetX: 126,
      offsetY: -82,
      tone: "border-sky-300 bg-sky-50 text-sky-700 shadow-sky-100/80",
    },
    {
      id: "hold",
      label: tGantt("quick.radial.hold"),
      hint: tGantt("quick.radial.temporary"),
      offsetX: -126,
      offsetY: 82,
      tone: "border-amber-300 bg-amber-50 text-amber-700 shadow-amber-100/80",
    },
    {
      id: "block",
      label: tGantt("quick.radial.block"),
      hint: tGantt("quick.radial.unavailable"),
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
          <div className="mt-1 text-base font-extrabold text-zinc-800">{tGantt("quick.radial.choose")}</div>
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
  const [guestLastName, setGuestLastName] = useState("");
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [identityHint, setIdentityHint] = useState<string | null>(null);
  const [identityHintTone, setIdentityHintTone] = useState<
    "neutral" | "warn"
  >("neutral");
  const [identityPending, startIdentityTransition] = useTransition();
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
            ? `${sourceRoomName} → ${targetRoomName}: ${formatStayPeriod(res.preview.targetSegment.start, res.preview.targetSegment.end, locale, true)} · ` +
              `Total: ${res.preview.oldTotal} → ${res.preview.newTotal} RON`
            : `${sourceRoomName}: ${formatStayPeriod(res.preview.sourceSegment?.start ?? "", res.preview.sourceSegment?.end ?? "", locale, true)} · ` +
              `→ ${targetRoomName}: ${formatStayPeriod(res.preview.targetSegment.start, res.preview.targetSegment.end, locale, true)} · ` +
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
      onClose();
      router.refresh();
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
      onClose();
      router.refresh();
    });
  }

  function maybeAutofillGuest() {
    const hasIdentity =
      guestEmail.trim().length > 0 ||
      guestPhone.trim().length > 0 ||
      (guestLastName.trim().length > 1 && guestFirstName.trim().length > 1);
    if (!hasIdentity) return;
    startIdentityTransition(async () => {
      const res = await suggestExistingGuestAction({
        guest_last_name: guestLastName,
        guest_first_name: guestFirstName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
      });
      if (!res.ok || !res.match) return;
      setGuestLastName(res.match.lastName);
      setGuestFirstName(res.match.firstName);
      setGuestEmail(res.match.email ?? guestEmail);
      setGuestPhone(res.match.phone ?? guestPhone);
      if (res.match.flagLevel === "blacklist") {
        setIdentityHintTone("warn");
        setIdentityHint(
          tGantt("quick.existingGuestBlacklist", {
            name: res.match.displayName,
          }),
        );
      } else if (res.match.flagLevel === "watchlist") {
        setIdentityHintTone("warn");
        setIdentityHint(
          tGantt("quick.existingGuestWatchlist", {
            name: res.match.displayName,
          }),
        );
      } else {
        setIdentityHintTone("neutral");
        setIdentityHint(
          tGantt("quick.existingGuestFound", {
            name: res.match.displayName,
          }),
        );
      }
    });
  }

  function submitGuestCreate(kind: "cerere" | "direct") {
    if (!activeRoomId) {
      setError(tGantt("quick.errors.chooseRoom"));
      return;
    }
    if (!ensureCreatableInterval()) return;
    if (!guestPhone.trim()) {
      setError(tGantt("quick.errors.phoneRequired"));
      return;
    }
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
        title: kind === "cerere" ? tGantt("quick.requestCreated") : tGantt("quick.directCreated"),
        message:
          kind === "cerere"
            ? tGantt("quick.requestAppears")
            : tGantt("quick.bookingAppears"),
      });
      onClose();
      router.refresh();
    });
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
      onClose();
      router.refresh();
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
          ? `${multiRoomCount} camere selectate`
          : activeRoom?.name ?? draft.roomName}
      </strong>
      {!hasMultiRoomDraft && activeRoom?.building_name ? (
        <span className="text-zinc-500"> · {activeRoom.building_name}</span>
      ) : null}
    </>
  ) : (
    <>
        <strong className="font-semibold text-zinc-900">{activeRoom?.name ?? tGantt("quick.chooseRoom")}</strong>
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
              minCheckIn={effectiveToday}
              invalidInterval={intervalInvalid}
              hasConflict={hasConflict}
              invalidMessage={tGantt("quick.chooseCheckoutAfterCheckin")}
              nightLabel={(count) => tGantt("quick.nightsLabel", { count })}
              locale={locale}
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
          <ActionRadial
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
                Motiv
                <input
                  className={inputClass}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={tGantt("quick.holdReasonPlaceholder")}
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
                  placeholder={tGantt("quick.hoursOptionalPlaceholder")}
                />
              </label>
            </div>
            <div className="gantt-quick-panel__actions flex gap-2">
              {allowBack ? (
                <button
                  type="button"
                  className="admin-floating-panel__btn gantt-quick-panel__action flex-1"
                  onClick={handleBack}
                >
                  Înapoi la radial
                </button>
              ) : null}
              <button
                type="button"
                className="admin-floating-panel__btn admin-floating-panel__btn--primary gantt-quick-panel__action gantt-quick-panel__action--primary flex-1"
                disabled={pending || !activeRoomId || hasConflict || intervalInvalid}
                onClick={submitHold}
              >
                {pending ? tCommon("saving") : "Creează hold"}
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
                  placeholder={tGantt("quick.shortDescription")}
                />
              </label>
            ) : null}
            <div className="gantt-quick-panel__actions flex gap-2">
              {allowBack ? (
                <button
                  type="button"
                  className="admin-floating-panel__btn gantt-quick-panel__action flex-1"
                  onClick={handleBack}
                >
                  Înapoi la radial
                </button>
              ) : null}
              <button
                type="button"
                className="admin-floating-panel__btn admin-floating-panel__btn--primary gantt-quick-panel__action gantt-quick-panel__action--primary flex-1"
                disabled={
                  pending ||
                  !activeRoomId ||
                  hasConflict ||
                  hasMultiRoomDraft ||
                  intervalInvalid
                }
                onClick={submitBlock}
              >
                {pending ? tCommon("saving") : "Creează blocarea"}
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
                  onChange={(e) => {
                    setGuestLastName(e.target.value);
                    if (identityHint) setIdentityHint(null);
                  }}
                  onBlur={maybeAutofillGuest}
                />
              </label>
              <label className={labelClass}>
                Prenume
                <input
                  className={inputClass}
                  value={guestFirstName}
                  onChange={(e) => {
                    setGuestFirstName(e.target.value);
                    if (identityHint) setIdentityHint(null);
                  }}
                  onBlur={maybeAutofillGuest}
                />
              </label>
            </div>
            {(identityPending || identityHint) && (
              <p
                className={[
                  "text-xs",
                  identityHintTone === "warn"
                    ? "text-amber-800"
                    : "text-emerald-800",
                ].join(" ")}
              >
                {identityPending ? tCommon("loading") : identityHint}
              </p>
            )}
            <label className={labelClass}>
              Email
              <input
                type="email"
                className={inputClass}
                value={guestEmail}
                onChange={(e) => {
                  setGuestEmail(e.target.value);
                  if (identityHint) setIdentityHint(null);
                }}
                onBlur={maybeAutofillGuest}
              />
            </label>
            <label className={labelClass}>
              Telefon *
              <input
                className={inputClass}
                type="tel"
                required
                value={guestPhone}
                onChange={(e) => {
                  setGuestPhone(e.target.value);
                  if (identityHint) setIdentityHint(null);
                }}
                onBlur={maybeAutofillGuest}
              />
            </label>
            <div className="gantt-quick-panel__actions flex gap-2">
              {allowBack ? (
                <button
                  type="button"
                  className="admin-floating-panel__btn gantt-quick-panel__action flex-1"
                  onClick={handleBack}
                >
                  Înapoi la radial
                </button>
              ) : null}
              <button
                type="button"
                className="admin-floating-panel__btn admin-floating-panel__btn--primary gantt-quick-panel__action gantt-quick-panel__action--primary flex-1"
                disabled={
                  pending ||
                  !activeRoomId ||
                  hasConflict ||
                  hasMultiRoomDraft ||
                  intervalInvalid
                }
                onClick={() => submitGuestCreate(mode)}
              >
                {pending
                  ? tCommon("saving")
                  : mode === "cerere"
                    ? tGantt("quick.createRequest")
                    : tGantt("quick.confirmStay")}
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
                <option value="">{tCommon("selectPlaceholder")}</option>
                {confirmedBookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.guest_name} · {booking.room_names.join(", ")}
                  </option>
                ))}
              </select>
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
                      <option value="">{tCommon("selectPlaceholder")}</option>
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
                  className="admin-floating-panel__btn admin-floating-panel__btn--primary gantt-quick-panel__action gantt-quick-panel__action--primary w-full"
                  disabled={pending || !moveTargetRoomId}
                  onClick={submitMove}
                >
                  {pending ? tCommon("saving") : "Confirmă mutarea"}
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
      </div>

      <div className="gantt-quick-panel__footer">
        <button
          type="button"
          className="admin-floating-panel__btn gantt-quick-panel__cancel w-full"
          onClick={onClose}
        >
          Anulează
        </button>
      </div>
    </AdminFloatingPanel>
  );
}
