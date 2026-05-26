"use client";

import { updateGuestProfileControlsAction } from "@/app/admin/(panel)/guests/actions";
import type { GuestProfileRow } from "@/domain/guest/types";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";

export function GuestProfileControlsForm({
  guestId,
  profile,
}: {
  guestId: string;
  profile: GuestProfileRow | null;
}) {
  return (
    <AdminPendingForm action={updateGuestProfileControlsAction} className="space-y-4">
      <input type="hidden" name="guest_id" value={guestId} />
      <input
        type="hidden"
        name="blacklist_reason"
        value={profile?.blacklist_reason ?? ""}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-bold">Status operațional</span>
          <select
            name="flag_level"
            defaultValue={profile?.flag_level === "watchlist" ? "watchlist" : "normal"}
            className="w-full border border-zinc-300 bg-white px-3 py-2"
          >
            <option value="normal">Normal</option>
            <option value="watchlist">Watchlist</option>
          </select>
          <span className="block text-xs text-zinc-500">
            Blacklist-ul se gestionează separat din panoul dedicat.
          </span>
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
