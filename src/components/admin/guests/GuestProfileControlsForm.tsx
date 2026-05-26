"use client";

import { useState } from "react";
import { updateGuestProfileControlsAction } from "@/app/admin/(panel)/guests/actions";
import type { GuestFlagLevel, GuestProfileRow } from "@/domain/guest/types";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";

export function GuestProfileControlsForm({
  guestId,
  profile,
}: {
  guestId: string;
  profile: GuestProfileRow | null;
}) {
  const [flagLevel, setFlagLevel] = useState<GuestFlagLevel>(
    profile?.flag_level ?? "normal"
  );
  const requiresReason = flagLevel === "blacklist";

  return (
    <AdminPendingForm action={updateGuestProfileControlsAction} className="space-y-4">
      <input type="hidden" name="guest_id" value={guestId} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-bold">Status profil</span>
          <select
            name="flag_level"
            defaultValue={profile?.flag_level ?? "normal"}
            onChange={(e) =>
              setFlagLevel(
                e.target.value === "blacklist" || e.target.value === "watchlist"
                  ? e.target.value
                  : "normal"
              )
            }
            className="w-full border border-zinc-300 bg-white px-3 py-2"
          >
            <option value="normal">Normal</option>
            <option value="watchlist">Watchlist</option>
            <option value="blacklist">Blacklist</option>
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-bold">Motiv blacklist</span>
          <input
            name="blacklist_reason"
            defaultValue={profile?.blacklist_reason ?? ""}
            placeholder="Ex: neplată, pagube, conflict repetat"
            required={requiresReason}
            className="w-full border border-zinc-300 px-3 py-2"
          />
          {requiresReason && (
            <span className="block text-xs text-amber-800">
              Când pui un client în blacklist, motivul devine obligatoriu.
            </span>
          )}
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-bold">Ajustare trust</span>
          <input
            name="manual_trust_adjustment"
            type="number"
            min={-40}
            max={40}
            defaultValue={profile?.manual_trust_adjustment ?? 0}
            className="w-full border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-bold">Ajustare fidelitate</span>
          <input
            name="manual_loyalty_adjustment"
            type="number"
            min={-40}
            max={40}
            defaultValue={profile?.manual_loyalty_adjustment ?? 0}
            className="w-full border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="font-bold">Notă internă despre profil</span>
        <textarea
          name="manual_note"
          rows={3}
          defaultValue={profile?.manual_note ?? ""}
          placeholder="Observații generale, context pentru staff, motiv de watchlist etc."
          className="w-full border border-zinc-300 px-3 py-2"
        />
      </label>

      <AdminSubmitButton
        type="submit"
        pendingLabel="Salvez…"
        className="admin-cereri-fill px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        Salvează scoruri și flag
      </AdminSubmitButton>
    </AdminPendingForm>
  );
}
