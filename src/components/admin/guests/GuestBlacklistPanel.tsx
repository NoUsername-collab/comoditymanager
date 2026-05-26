"use client";

import { useState } from "react";
import { updateGuestProfileControlsAction } from "@/app/admin/(panel)/guests/actions";
import type { GuestProfileRow } from "@/domain/guest/types";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";

export function GuestBlacklistPanel({
  guestId,
  profile,
  compact = false,
}: {
  guestId: string;
  profile: GuestProfileRow | null;
  compact?: boolean;
}) {
  const initiallyBlacklisted = profile?.flag_level === "blacklist";
  const [flagLevel, setFlagLevel] = useState(profile?.flag_level ?? "normal");
  const [reason, setReason] = useState(profile?.blacklist_reason ?? "");
  const isBlacklisted = flagLevel === "blacklist";
  const isEditingExisting = initiallyBlacklisted && isBlacklisted;

  return (
    <div
      className={[
        "rounded-xl border px-4 py-4",
        isBlacklisted
          ? "border-red-500 bg-neutral-950 text-red-100"
          : "border-zinc-300 bg-zinc-950 text-zinc-100",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-red-400">
            Blacklist
          </p>
          <p className="mt-1 text-sm text-zinc-300">
            {isBlacklisted
              ? "Clientul este marcat și va ridica alertă la rezervări noi."
              : "Marchează imediat clientul ca blacklist cu motiv clar pentru staff."}
          </p>
        </div>
        <div
          className={[
            "rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em]",
            isBlacklisted
              ? "border-red-500 bg-red-950 text-red-300"
              : "border-zinc-700 bg-zinc-900 text-zinc-400",
          ].join(" ")}
        >
          {isBlacklisted ? "Activ" : "Inactiv"}
        </div>
      </div>

      <AdminPendingForm
        action={updateGuestProfileControlsAction}
        className={compact ? "mt-4 space-y-3" : "mt-4 space-y-4"}
      >
        <input type="hidden" name="guest_id" value={guestId} />
        <input
          type="hidden"
          name="manual_trust_adjustment"
          value={profile?.manual_trust_adjustment ?? 0}
        />
        <input
          type="hidden"
          name="manual_loyalty_adjustment"
          value={profile?.manual_loyalty_adjustment ?? 0}
        />
        <input type="hidden" name="manual_note" value={profile?.manual_note ?? ""} />
        <input type="hidden" name="flag_level" value={flagLevel} />

        <label className="block space-y-1 text-sm">
          <span className="font-semibold text-red-300">Motiv</span>
          <textarea
            name="blacklist_reason"
            rows={compact ? 2 : 3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: neplată, pagube, conflict repetat, încălcarea regulilor"
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
            required={isBlacklisted}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {!isBlacklisted ? (
            <button
              type="button"
              onClick={() => setFlagLevel("blacklist")}
              className="rounded border border-red-700 bg-black px-4 py-2 text-sm font-bold text-red-400 hover:bg-zinc-950"
            >
              Activează modul blacklist
            </button>
          ) : (
            <>
              <AdminSubmitButton
                type="submit"
                pendingLabel={
                  isEditingExisting ? "Actualizez blacklist…" : "Pun în blacklist…"
                }
                className="rounded border border-red-700 bg-black px-4 py-2 text-sm font-bold text-red-400 disabled:opacity-60"
              >
                {isEditingExisting ? "Actualizează blacklist" : "Adaugă în blacklist"}
              </AdminSubmitButton>
              {!isEditingExisting && (
                <button
                  type="button"
                  onClick={() => {
                    setFlagLevel("normal");
                    setReason("");
                  }}
                  className="rounded border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
                >
                  Anulează
                </button>
              )}
            </>
          )}

          {initiallyBlacklisted && (
            <>
              <button
                type="submit"
                onClick={() => setFlagLevel("normal")}
                className="rounded border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
              >
                Scoate din blacklist
              </button>
            </>
          )}
        </div>

        {isBlacklisted && (
          <p className="text-xs text-red-300">
            Butonul de blacklist trimite alerta puternică în sistem și păstrează motivul pe profil.
          </p>
        )}
      </AdminPendingForm>
    </div>
  );
}
