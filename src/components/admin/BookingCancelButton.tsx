"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAdminPending, useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";

export function BookingCancelButton({
  label,
  confirmMessage,
  formAction,
  bookingId,
  returnTo = "/admin/bookings",
  variant = "default",
}: {
  label: string;
  confirmMessage: string;
  formAction: (formData: FormData) => Promise<void>;
  bookingId: string;
  returnTo?: string;
  variant?: "default" | "compact";
}) {
  const tCommon = useTranslations("admin.common");
  const [open, setOpen] = useState(false);
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();

  const triggerClass =
    variant === "compact"
      ? "w-full rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
      : "text-sm text-red-600 hover:text-red-800 disabled:opacity-50";

  const panelClass =
    variant === "compact"
      ? "rounded-md border border-red-200 bg-red-50 p-2 text-xs"
      : "rounded-lg border border-red-200 bg-red-50 p-3 text-sm";

  const btnClass =
    variant === "compact"
      ? "rounded px-2 py-1 text-[10px] font-medium"
      : "rounded-md px-3 py-1 text-xs font-medium";

  if (!open) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(true)}
        className={triggerClass}
      >
        {label}
      </button>
    );
  }

  return (
    <form
      data-admin-pending="true"
      action={(fd) =>
        runAdminAction(async () => {
          await formAction(fd);
          setOpen(false);
        })
      }
      className={panelClass}
    >
      <input type="hidden" name="id" value={bookingId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <p className="text-red-900">{confirmMessage}</p>
      <ConfirmButtons
        btnClass={btnClass}
        pending={pending}
        onCancel={() => setOpen(false)}
        labels={{
          cancelling: tCommon("cancelling"),
          confirmCancel: tCommon("confirmCancel"),
          dismiss: tCommon("dismiss"),
        }}
      />
    </form>
  );
}

function ConfirmButtons({
  btnClass,
  pending,
  onCancel,
  labels,
}: {
  btnClass: string;
  pending: boolean;
  onCancel: () => void;
  labels: { cancelling: string; confirmCancel: string; dismiss: string };
}) {
  return (
    <div className="mt-2 flex gap-2">
      <button
        type="submit"
        disabled={pending}
        className={`${btnClass} bg-red-600 text-white hover:bg-red-700 disabled:opacity-50`}
      >
        {pending ? labels.cancelling : labels.confirmCancel}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={onCancel}
        className={`${btnClass} border border-zinc-300 bg-white text-zinc-700`}
      >
        {labels.dismiss}
      </button>
    </div>
  );
}
