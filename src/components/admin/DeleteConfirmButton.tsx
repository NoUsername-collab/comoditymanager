"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAdminPending, useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";
import { AdminTextActionButton } from "@/components/admin/ui/AdminTextAction";

export type AdminDeleteFormAction = (
  formData: FormData
) => Promise<{ error?: string } | void>;

export function DeleteConfirmButton({
  label,
  confirmMessage,
  formAction,
  hiddenFields,
}: {
  label: string;
  confirmMessage: string;
  formAction: AdminDeleteFormAction;
  hiddenFields: Record<string, string>;
}) {
  const tCommon = useTranslations("admin.common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();

  if (!open) {
    return (
      <AdminTextActionButton
        type="button"
        variant="danger"
        disabled={pending}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="text-sm"
      >
        {label}
      </AdminTextActionButton>
    );
  }

  return (
    <form
      data-admin-pending="true"
      action={(fd) =>
        runAdminAction(async () => {
          setError(null);
          const result = await formAction(fd);
          if (result?.error) {
            setError(result.error);
            return;
          }
          setOpen(false);
          router.refresh();
        })
      }
      className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm"
    >
      {Object.entries(hiddenFields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <p className="text-red-900">{confirmMessage}</p>
      {error && (
        <p className="mt-2 rounded-md border border-red-300 bg-white px-2 py-1.5 text-xs font-medium text-red-800" role="alert">
          {error}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-700 active:translate-y-px active:bg-red-800 disabled:opacity-50"
        >
          {pending ? tCommon("deleting") : tCommon("confirmDelete")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setOpen(false)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 transition hover:bg-zinc-50 active:translate-y-px active:bg-zinc-100"
        >
          {tCommon("cancel")}
        </button>
      </div>
    </form>
  );
}
