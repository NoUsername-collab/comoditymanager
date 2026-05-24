"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCerereFromGanttAction,
  createDirectStayFromGanttAction,
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

export type GanttCreateDraft = {
  roomId: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  hasConflict: boolean;
};

type Mode = "pick" | "hold" | "block" | "cerere" | "direct";

type Props = {
  draft: GanttCreateDraft | null;
  onClose: () => void;
};

export function GanttCreateDialog({ draft, onClose }: Props) {
  const router = useRouter();
  const { showToast } = useAdminFx();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("pick");
  const [reason, setReason] = useState("");
  const [blockPreset, setBlockPreset] =
    useState<BlockReasonPresetId>("maintenance");
  const [blockCustom, setBlockCustom] = useState("");
  const [expiresHours, setExpiresHours] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!draft) return null;

  const period = formatStayPeriod(draft.checkIn, draft.checkOut, true);
  const conflict = draft.hasConflict;

  function resetForm() {
    setMode("pick");
    setReason("");
    setBlockPreset("maintenance");
    setBlockCustom("");
    setExpiresHours("");
    setLastName("");
    setFirstName("");
    setEmail("");
    setPhone("");
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function submitHold() {
    if (!draft) return;
    const d = draft;
    setError(null);
    startTransition(async () => {
      const hours = expiresHours.trim() ? Number(expiresHours) : null;
      const res = await createRoomHoldFromGanttAction({
        roomId: d.roomId,
        checkIn: d.checkIn,
        checkOut: d.checkOut,
        reason,
        expiresHours: hours,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.undo) {
        showGanttCreateUndoToast(showToast, router, "Hold creat", period, res.undo);
      } else {
        showToast({ kind: "success", title: "Hold creat", message: period });
      }
      handleClose();
      router.refresh();
    });
  }

  function submitBlock() {
    if (!draft) return;
    const d = draft;
    setError(null);
    const resolvedReason = resolveBlockReason(blockPreset, blockCustom);
    if (!resolvedReason) {
      setError("Motivul blocării este obligatoriu.");
      return;
    }
    startTransition(async () => {
      const res = await createRoomBlockFromGanttAction({
        roomId: d.roomId,
        checkIn: d.checkIn,
        checkOut: d.checkOut,
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
      handleClose();
      router.refresh();
    });
  }

  function submitCerere(direct: boolean) {
    if (!draft) return;
    const d = draft;
    setError(null);
    startTransition(async () => {
      const payload = {
        roomId: d.roomId,
        checkIn: d.checkIn,
        checkOut: d.checkOut,
        guestLastName: lastName,
        guestFirstName: firstName,
        guestEmail: email,
        guestPhone: phone,
      };
      const res = direct
        ? await createDirectStayFromGanttAction(payload)
        : await createCerereFromGanttAction(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      showToast({
        kind: "success",
        title: direct ? "Cazare confirmată" : "Cerere creată",
        message: direct
          ? "Rezervarea apare pe calendar."
          : "Deschidem detaliul cererii.",
      });
      handleClose();
      router.refresh();
      if (!direct) router.push(`/admin/bookings/${res.id}`);
    });
  }

  return (
    <AdminFloatingPanel
      open
      onClose={handleClose}
      title="Interval selectat"
      variant="modal"
      width={420}
    >
      <div className="gantt-create-dialog space-y-3">
        <p className="text-sm text-zinc-600">
          <strong>{draft.roomName}</strong>
          <br />
          {period}
        </p>

        {conflict && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Interval cu suprapunere — alege alt interval sau eliberează camera.
          </p>
        )}

        {mode === "pick" && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="admin-floating-panel__btn admin-floating-panel__btn--primary"
              disabled={conflict || pending}
              onClick={() => setMode("hold")}
            >
              Hold
            </button>
            <button
              type="button"
              className="admin-floating-panel__btn"
              disabled={conflict || pending}
              onClick={() => setMode("block")}
            >
              Blocare
            </button>
            <button
              type="button"
              className="admin-floating-panel__btn"
              disabled={conflict || pending}
              onClick={() => setMode("cerere")}
            >
              Cerere
            </button>
            <button
              type="button"
              className="admin-floating-panel__btn"
              disabled={conflict || pending}
              onClick={() => setMode("direct")}
            >
              Cazare directă
            </button>
          </div>
        )}

        {mode === "hold" && (
          <div className="space-y-2">
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
                placeholder="Gol = doar manual"
              />
            </label>
            <div className="flex gap-2 pt-1">
              <button type="button" className="admin-floating-panel__btn" onClick={() => setMode("pick")}>
                Înapoi
              </button>
              <button
                type="button"
                className="admin-floating-panel__btn admin-floating-panel__btn--primary"
                disabled={pending || conflict}
                onClick={submitHold}
              >
                Creează hold
              </button>
            </div>
          </div>
        )}

        {mode === "block" && (
          <div className="space-y-2">
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
            {(blockPreset === "other" || blockCustom) && (
              <label className="block text-xs font-semibold text-zinc-600">
                Detalii{blockPreset === "other" ? " *" : " (opțional)"}
                <input
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                  value={blockCustom}
                  onChange={(e) => setBlockCustom(e.target.value)}
                  placeholder="Descriere scurtă"
                />
              </label>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" className="admin-floating-panel__btn" onClick={() => setMode("pick")}>
                Înapoi
              </button>
              <button
                type="button"
                className="admin-floating-panel__btn admin-floating-panel__btn--primary"
                disabled={pending || conflict}
                onClick={submitBlock}
              >
                Blochează camera
              </button>
            </div>
          </div>
        )}

        {(mode === "cerere" || mode === "direct") && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-600">
              Nume
              <input
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-zinc-600">
              Prenume
              <input
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-zinc-600">
              Email
              <input
                type="email"
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-zinc-600">
              Telefon
              <input
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <div className="flex gap-2 pt-1">
              <button type="button" className="admin-floating-panel__btn" onClick={() => setMode("pick")}>
                Înapoi
              </button>
              <button
                type="button"
                className="admin-floating-panel__btn admin-floating-panel__btn--primary"
                disabled={pending || conflict}
                onClick={() => submitCerere(mode === "direct")}
              >
                {mode === "direct" ? "Confirmă cazarea" : "Creează cererea"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {mode === "pick" && (
          <button type="button" className="admin-floating-panel__btn w-full" onClick={handleClose}>
            Anulează
          </button>
        )}
      </div>
    </AdminFloatingPanel>
  );
}
