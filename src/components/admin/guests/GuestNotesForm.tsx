"use client";

import { useTransition } from "react";
import { updateGuestNotesAction } from "@/app/admin/(panel)/guests/actions";

export function GuestNotesForm({
  guestId,
  initialNotes,
}: {
  guestId: string;
  initialNotes: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(() => updateGuestNotesAction(fd))}
      className="space-y-2"
    >
      <input type="hidden" name="guest_id" value={guestId} />
      <textarea
        name="notes"
        rows={4}
        defaultValue={initialNotes}
        placeholder="Note interne despre client…"
        className="w-full border border-zinc-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="admin-cereri-fill px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "Salvez…" : "Salvează note"}
      </button>
    </form>
  );
}
