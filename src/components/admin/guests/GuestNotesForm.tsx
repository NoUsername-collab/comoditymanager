"use client";

import { updateGuestNotesAction } from "@/app/admin/(panel)/guests/actions";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";

export function GuestNotesForm({
  guestId,
  initialNotes,
}: {
  guestId: string;
  initialNotes: string;
}) {
  return (
    <AdminPendingForm action={updateGuestNotesAction} className="space-y-2">
      <input type="hidden" name="guest_id" value={guestId} />
      <textarea
        name="notes"
        rows={4}
        defaultValue={initialNotes}
        placeholder="Note interne despre client…"
        className="w-full border border-zinc-300 px-3 py-2 text-sm"
      />
      <AdminSubmitButton
        type="submit"
        pendingLabel="Salvez…"
        className="admin-cereri-fill px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        Salvează note
      </AdminSubmitButton>
    </AdminPendingForm>
  );
}
