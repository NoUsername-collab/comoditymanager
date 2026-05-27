"use client";

import { useState } from "react";
import { updateGuestNotesAction } from "@/app/admin/(panel)/guests/actions";
import { useAdminPending, useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import { AdminAlertDialog } from "@/components/admin/overlay/AdminAlertDialog";

export function GuestNotesForm({
  guestId,
  initialNotes,
}: {
  guestId: string;
  initialNotes: string;
}) {
  const runAdminAction = useRunAdminAction();
  const { pending } = useAdminPending();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(initialNotes);
  const [error, setError] = useState<string | null>(null);

  async function saveNotes() {
    const formData = new FormData();
    formData.set("guest_id", guestId);
    formData.set("notes", draft);
    try {
      await runAdminAction(() => updateGuestNotesAction(formData));
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nu am putut salva notele.");
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={pending}
          className="admin-cereri-fill px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {initialNotes.trim() ? "Editează notele generale" : "Adaugă note generale"}
        </button>
        <span className="text-xs text-zinc-500">
          {initialNotes.trim() ? "Există note salvate pentru client." : "Nu există note generale încă."}
        </span>
      </div>

      <AdminFloatingPanel
        open={open}
        onClose={() => setOpen(false)}
        title="Note interne generale"
        variant="modal"
        width={640}
      >
        <div className="space-y-4 p-4">
          <textarea
            rows={8}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Note interne despre client…"
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700"
            >
              Închide
            </button>
            <button
              type="button"
              onClick={() => void saveNotes()}
              disabled={pending}
              className="admin-cereri-fill px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {pending ? "Salvez…" : "Salvează note"}
            </button>
          </div>
        </div>
      </AdminFloatingPanel>

      <AdminAlertDialog
        open={error != null}
        title="Note interne"
        message={error ?? ""}
        onClose={() => setError(null)}
      />
    </>
  );
}
