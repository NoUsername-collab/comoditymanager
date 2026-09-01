"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cancelBookingOperativeAction } from "@/features/bookings/actions";
import { useAdminPending, useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { AdminTextActionButton } from "@/components/admin/ui/AdminTextAction";
import { publishCazariStayCancelled } from "@/lib/cazari/live-stays";
import { removeGanttLiveBooking } from "@/lib/gantt/live-bookings";

export function BookingCancelButton({
  label,
  confirmMessage,
  formAction,
  bookingId,
  returnTo = "/admin/bookings",
  variant = "default",
  /** Fast path: JSON action + live UI patch, no redirect/RSC reload. */
  operative = false,
  onOperativeSuccess,
}: {
  label: string;
  confirmMessage: string;
  formAction: (formData: FormData) => Promise<void>;
  bookingId: string;
  returnTo?: string;
  variant?: "default" | "compact";
  operative?: boolean;
  onOperativeSuccess?: () => void;
}) {
  const tCommon = useTranslations("admin.common");
  const { showToast } = useAdminFx();
  const [open, setOpen] = useState(false);
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();

  const triggerClass =
    variant === "compact" ? "stay-card__cancel-trigger" : undefined;

  const panelClass =
    variant === "compact"
      ? "rounded-md border border-red-200 bg-red-50 p-2 text-xs"
      : "rounded-lg border border-red-200 bg-red-50 p-3 text-sm";

  const btnClass =
    variant === "compact"
      ? "rounded px-2 py-1 text-[10px] font-medium"
      : "rounded-md px-3 py-1 text-xs font-medium";

  function confirmOperativeCancel() {
    void runAdminAction(async () => {
      const res = await cancelBookingOperativeAction(bookingId);
      if (!res.ok) {
        showToast({ kind: "error", title: tCommon("error"), message: res.error });
        return;
      }
      publishCazariStayCancelled(bookingId);
      removeGanttLiveBooking(bookingId);
      onOperativeSuccess?.();
      setOpen(false);
    });
  }

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

  if (operative) {
    return (
      <div
        className={`booking-cancel-form ${panelClass}`}
        aria-live="polite"
        data-admin-pending={pending ? "true" : undefined}
      >
        <p className="text-red-900">{confirmMessage}</p>
        <ConfirmButtons
          btnClass={btnClass}
          pending={pending}
          onCancel={() => setOpen(false)}
          onConfirm={confirmOperativeCancel}
          labels={{
            cancelling: tCommon("cancelling"),
            confirmCancel: tCommon("confirmCancel"),
            dismiss: tCommon("dismiss"),
          }}
        />
      </div>
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
  onConfirm,
  labels,
}: {
  btnClass: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm?: () => void;
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
        type={onConfirm ? "button" : "submit"}
        disabled={pending}
        onClick={onConfirm}
        className={`booking-cancel-form__confirm ${btnClass} bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 min-h-[var(--ml-touch-min,2.75rem)] sm:min-h-0`}
      >
        {pending ? labels.cancelling : labels.confirmCancel}
      </button>
    </div>
  );
}
