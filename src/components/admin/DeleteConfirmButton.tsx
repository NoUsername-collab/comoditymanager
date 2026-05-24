"use client";

import { useState } from "react";
import { useAdminPending, useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";

export function DeleteConfirmButton({
  label,
  confirmMessage,
  formAction,
  hiddenFields,
}: {
  label: string;
  confirmMessage: string;
  formAction: (formData: FormData) => Promise<void>;
  hiddenFields: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();

  if (!open) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(true)}
        className="text-sm text-red-600 hover:text-red-800"
      >
        {label}
      </button>
    );
  }

  return (
    <form
      action={(fd) => {
        void runAdminAction(async () => {
          await formAction(fd);
          setOpen(false);
        });
      }}
      className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm"
    >
      {Object.entries(hiddenFields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <p className="text-red-900">{confirmMessage}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "Se șterge…" : "Da, șterge"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setOpen(false)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700"
        >
          Anulează
        </button>
      </div>
    </form>
  );
}
