"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAdminPending,
  useRunAdminAction,
} from "@/components/admin/feedback/AdminPendingProvider";
import {
  createRoomBlockFromGanttAction,
  createRoomHoldFromGanttAction,
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
import { addDays, todayIso } from "@/lib/stay-dates";

type RoomOption = {
  id: string;
  name: string;
  building_name: string;
};

type Props = {
  mode: "hold" | "block" | null;
  rooms: RoomOption[];
  onClose: () => void;
};

export function GanttToolbarOccForm({ mode, rooms, onClose }: Props) {
  const router = useRouter();
  const { showToast } = useAdminFx();
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [checkIn, setCheckIn] = useState(todayIso());
  const [checkOut, setCheckOut] = useState(addDays(todayIso(), 1));
  const [reason, setReason] = useState("");
  const [expiresHours, setExpiresHours] = useState("");
  const [blockPreset, setBlockPreset] =
    useState<BlockReasonPresetId>("maintenance");
  const [blockCustom, setBlockCustom] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!mode) return null;

  const room = rooms.find((r) => r.id === roomId);
  const period =
    checkIn && checkOut ? formatStayPeriod(checkIn, checkOut, true) : "";

  function submitHold() {
    setError(null);
    void runAdminAction(async () => {
      const hours = expiresHours.trim() ? Number(expiresHours) : null;
      const res = await createRoomHoldFromGanttAction({
        roomId,
        checkIn,
        checkOut,
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
          "Hold creat",
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
    setError(null);
    const resolvedReason = resolveBlockReason(blockPreset, blockCustom);
    if (!resolvedReason) {
      setError("Motivul blocării este obligatoriu.");
      return;
    }
    void runAdminAction(async () => {
      const res = await createRoomBlockFromGanttAction({
        roomId,
        checkIn,
        checkOut,
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

  return (
    <AdminFloatingPanel
      open
      onClose={onClose}
      title={mode === "hold" ? "Hold cameră" : "Blocare cameră"}
      variant="modal"
      width={420}
    >
      <div className="gantt-toolbar-occ-form space-y-3">
        <label className="block text-xs font-semibold text-zinc-600">
          Cameră
          <select
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {r.building_name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-semibold text-zinc-600">
            Check-in
            <input
              type="date"
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold text-zinc-600">
            Check-out
            <input
              type="date"
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </label>
        </div>

        {room && period ? (
          <p className="text-sm text-zinc-600">
            <strong>{room.name}</strong> — {period}
          </p>
        ) : null}

        {mode === "hold" ? (
          <>
            <label className="block text-xs font-semibold text-zinc-600">
              Motiv (opțional)
              <input
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-zinc-600">
              Expiră după (ore, opțional)
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                value={expiresHours}
                onChange={(e) => setExpiresHours(e.target.value)}
                placeholder="Gol = doar eliberare manuală"
              />
            </label>
            <button
              type="button"
              className="admin-floating-panel__btn admin-floating-panel__btn--primary w-full"
              disabled={pending || !roomId}
              onClick={submitHold}
            >
              Creează hold
            </button>
          </>
        ) : (
          <>
            <label className="block text-xs font-semibold text-zinc-600">
              Motiv
              <select
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                value={blockPreset}
                onChange={(e) =>
                  setBlockPreset(e.target.value as BlockReasonPresetId)
                }
              >
                {BLOCK_REASON_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            {blockPreset === "other" || blockCustom ? (
              <label className="block text-xs font-semibold text-zinc-600">
                Detalii{blockPreset === "other" ? " *" : " (opțional)"}
                <input
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                  value={blockCustom}
                  onChange={(e) => setBlockCustom(e.target.value)}
                  placeholder="Descriere scurtă"
                />
              </label>
            ) : null}
            <button
              type="button"
              className="admin-floating-panel__btn admin-floating-panel__btn--primary w-full"
              disabled={pending || !roomId}
              onClick={submitBlock}
            >
              Blochează camera
            </button>
          </>
        )}

        {error ? (
          <p className="text-sm text-red-600" role="alert">
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
