"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { updateGuestNotesAction } from "@/app/[locale]/admin/(panel)/guests/actions";
import { useAdminPending, useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import { AdminAlertDialog } from "@/components/admin/overlay/AdminAlertDialog";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminTextarea } from "@/components/admin/ui/AdminInput";

export function GuestNotesForm({
  guestId,
  initialNotes,
}: {
  guestId: string;
  initialNotes: string;
}) {
  const tGuests = useTranslations("admin.guests");
  const tCommon = useTranslations("admin.common");
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
      setError(e instanceof Error ? e.message : tGuests("notes.couldNotSave"));
    }
  }

  return (
    <>
      <div className="guest-notes-form flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={pending}
          className="guest-notes-form__trigger admin-cereri-fill px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {initialNotes.trim() ? tGuests("notes.editGeneralNotes") : tGuests("notes.addGeneralNotes")}
        </button>
        <span className="text-xs text-zinc-500">
          {initialNotes.trim() ? tGuests("notes.savedForGuest") : tGuests("notes.noneYet")}
        </span>
      </div>

      <AdminFloatingPanel
        open={open}
        onClose={() => setOpen(false)}
        title={tGuests("notes.internalGeneralNotes")}
        variant="modal"
        width={640}
      >
        <div className="guest-notes-form__body space-y-4 p-4">
          <AdminTextarea
            rows={8}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={tGuests("notes.placeholder")}
            className="guest-notes-form__textarea"
          />
          <div className="guest-notes-form__actions flex flex-wrap justify-end gap-2">
            <AdminButton
              variant="secondary"
              onClick={() => setOpen(false)}
              className="guest-notes-form__cancel"
            >
              {tCommon("close")}
            </AdminButton>
            <button
              type="button"
              onClick={() => void saveNotes()}
              disabled={pending}
              className="guest-notes-form__save admin-cereri-fill px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {pending ? tCommon("saving") : tGuests("notes.saveNotes")}
            </button>
          </div>
        </div>
      </AdminFloatingPanel>

      <AdminAlertDialog
        open={error != null}
        title={tGuests("notes.internalNotesTitle")}
        message={error ?? ""}
        onClose={() => setError(null)}
      />
    </>
  );
}
