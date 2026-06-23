"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAdminPending, useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";
import { AdminTextActionButton } from "@/components/admin/ui/AdminTextAction";

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
      ? "stay-card__cancel-trigger w-full rounded-md border border-red-200 bg-red-50 font-medium text-red-700 transition hover:bg-red-100 active:translate-y-px active:bg-red-200/80 disabled:opacity-50"
      : undefined;

  const panelClass =
    variant === "compact"
      ? "rounded-md border border-red-200 bg-red-50 p-2 text-xs"
      : "rounded-lg border border-red-200 bg-red-50 p-3 text-sm";

  const btnClass =
    variant === "compact"
      ? "rounded px-2 py-1 text-[10px] font-medium"
      : "rounded-md px-3 py-1 text-xs font-medium";

  if (!open) {
    if (variant === "compact") {
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
      <AdminTextActionButton
        type="button"
        variant="danger"
        disabled={pending}
        onClick={() => setOpen(true)}
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
          await formAction(fd);
          setOpen(false);
        })
      }
      className={`booking-cancel-form ${panelClass}`}
      aria-live="polite"
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
    <div className="booking-cancel-form__actions mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={onCancel}
        className={`booking-cancel-form__dismiss ${btnClass} border border-zinc-300 bg-white text-zinc-700 min-h-[var(--ml-touch-min,2.75rem)] sm:min-h-0`}
      >
        {labels.dismiss}
      </button>
      <button
        type="submit"
        disabled={pending}
        className={`booking-cancel-form__confirm ${btnClass} bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 min-h-[var(--ml-touch-min,2.75rem)] sm:min-h-0`}
      >
        {pending ? labels.cancelling : labels.confirmCancel}
      </button>
    </div>
  );
}
