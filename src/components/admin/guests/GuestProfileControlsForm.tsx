"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { updateGuestProfileControlsAction } from "@/app/[locale]/admin/(panel)/guests/actions";
import type { GuestProfileRow } from "@/domain/guest/types";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";

export function GuestProfileControlsForm({
  guestId,
  profile,
}: {
  guestId: string;
  profile: GuestProfileRow | null;
}) {
  const tGuests = useTranslations("admin.guests");
  const tCommon = useTranslations("admin.common");
  const [noteOpen, setNoteOpen] = useState(false);
  const [manualNote, setManualNote] = useState(profile?.manual_note ?? "");

  return (
    <AdminPendingForm
      action={updateGuestProfileControlsAction}
      className="guest-profile-controls-form space-y-4"
    >
      <input type="hidden" name="guest_id" value={guestId} />
      <input
        type="hidden"
        name="blacklist_reason"
        value={profile?.blacklist_reason ?? ""}
      />

      <label className="guest-profile-controls-form__field block max-w-md space-y-1 text-sm">
        <span className="font-bold">{tGuests("profileControls.profileState")}</span>
        <select
          name="flag_level"
          defaultValue={profile?.flag_level === "watchlist" ? "watchlist" : "normal"}
          className="w-full border border-zinc-300 bg-white"
        >
          <option value="normal">{tGuests("profileControls.normal")}</option>
          <option value="watchlist">{tGuests("profileControls.watchlist")}</option>
        </select>
        <span className="block text-xs text-zinc-500">
          {tGuests("profileControls.blacklistManagedSeparately")}
        </span>
      </label>

      <input type="hidden" name="manual_note" value={manualNote} readOnly />

      <div className="space-y-2 text-sm">
        <p className="font-bold">{tGuests("profileControls.internalProfileNote")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="admin-cereri-fill px-4 py-2 text-sm font-medium"
          >
            {manualNote.trim()
              ? tGuests("profileControls.editProfileNote")
              : tGuests("profileControls.addProfileNote")}
          </button>
          <span className="text-xs text-zinc-500">
            {manualNote.trim()
              ? tGuests("profileControls.noteReady")
              : tGuests("profileControls.noProfileNoteYet")}
          </span>
        </div>
      </div>

      <AdminSubmitButton
        type="submit"
        pendingLabel={tCommon("saving")}
        className="admin-cereri-fill px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {tGuests("profileControls.saveGuestProfile")}
      </AdminSubmitButton>

      <AdminFloatingPanel
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title={tGuests("profileControls.internalProfileNote")}
        variant="modal"
        width={620}
      >
        <div className="space-y-4 p-4">
          <textarea
            rows={7}
            value={manualNote}
            onChange={(e) => setManualNote(e.target.value)}
            placeholder={tGuests("profileControls.notePlaceholder")}
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setNoteOpen(false)}
              className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700"
            >
              {tCommon("close")}
            </button>
            <button
              type="button"
              onClick={() => setNoteOpen(false)}
              className="admin-cereri-fill px-4 py-2 text-sm font-medium"
            >
              {tGuests("profileControls.applyInForm")}
            </button>
          </div>
        </div>
      </AdminFloatingPanel>
    </AdminPendingForm>
  );
}
