"use client";

import { useState } from "react";
import { updateGuestProfileControlsAction } from "@/app/admin/(panel)/guests/actions";
import type { GuestProfileRow } from "@/domain/guest/types";
import {
  GUEST_NEGATIVE_TRAITS,
  GUEST_NEGATIVE_TRAIT_LABELS,
  GUEST_POSITIVE_TRAITS,
  GUEST_POSITIVE_TRAIT_LABELS,
} from "@/domain/guest/reputation";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";

function TraitChecklist({
  title,
  name,
  options,
  labels,
  selected,
  tone,
}: {
  title: string;
  name: string;
  options: readonly string[];
  labels: Record<string, string>;
  selected: string[];
  tone: "good" | "bad";
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((trait) => (
          <label
            key={trait}
            className={[
              "inline-flex items-center gap-2 rounded border px-2 py-1 text-xs font-medium",
              tone === "good"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900",
            ].join(" ")}
          >
            <input
              type="checkbox"
              name={name}
              value={trait}
              defaultChecked={selected.includes(trait)}
            />
            <span>{labels[trait]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function GuestProfileControlsForm({
  guestId,
  profile,
}: {
  guestId: string;
  profile: GuestProfileRow | null;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [manualNote, setManualNote] = useState(profile?.manual_note ?? "");

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
          <span className="font-bold">Stare profil</span>
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

      <div className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3">
        <div>
          <p className="text-sm font-bold">Trăsături manuale</p>
          <p className="text-xs text-zinc-500">
            Poți selecta mai multe. Se combină cu trăsăturile venite din review-urile recente.
          </p>
        </div>

        <TraitChecklist
          title="Trăsături bune"
          name="manual_positive_traits"
          options={GUEST_POSITIVE_TRAITS}
          labels={GUEST_POSITIVE_TRAIT_LABELS}
          selected={profile?.manual_positive_traits ?? []}
          tone="good"
        />

        <TraitChecklist
          title="Trăsături de atenție"
          name="manual_negative_traits"
          options={GUEST_NEGATIVE_TRAITS}
          labels={GUEST_NEGATIVE_TRAIT_LABELS}
          selected={profile?.manual_negative_traits ?? []}
          tone="bad"
        />
      </div>

      <input type="hidden" name="manual_note" value={manualNote} readOnly />

      <div className="space-y-2 text-sm">
        <p className="font-bold">Notă internă despre profil</p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="admin-cereri-fill px-4 py-2 text-sm font-medium"
          >
            {manualNote.trim() ? "Editează nota profilului" : "Adaugă notă de profil"}
          </button>
          <span className="text-xs text-zinc-500">
            {manualNote.trim()
              ? "Există o notă de profil pregătită. Se salvează cu profilul."
              : "Fără notă de profil momentan."}
          </span>
        </div>
      </div>

      <AdminSubmitButton
        type="submit"
        pendingLabel="Salvez…"
        className="admin-cereri-fill px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        Salvează profilul clientului
      </AdminSubmitButton>

      <AdminFloatingPanel
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="Notă internă despre profil"
        variant="modal"
        width={620}
      >
        <div className="space-y-4 p-4">
          <textarea
            rows={7}
            value={manualNote}
            onChange={(e) => setManualNote(e.target.value)}
            placeholder="Observații generale, context pentru staff, motiv de watchlist etc."
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setNoteOpen(false)}
              className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700"
            >
              Închide
            </button>
            <button
              type="button"
              onClick={() => setNoteOpen(false)}
              className="admin-cereri-fill px-4 py-2 text-sm font-medium"
            >
              Aplică în formular
            </button>
          </div>
        </div>
      </AdminFloatingPanel>
    </AdminPendingForm>
  );
}
