"use client";

import { useState } from "react";

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
  const [open, setOpen] = useState(false);

  const triggerClass =
    variant === "compact"
      ? "w-full rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
      : "text-sm text-red-600 hover:text-red-800";

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
      <button type="button" onClick={() => setOpen(true)} className={triggerClass}>
        {label}
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
        setOpen(false);
      }}
      className={panelClass}
    >
      <input type="hidden" name="id" value={bookingId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <p className="text-red-900">{confirmMessage}</p>
      <ConfirmButtons btnClass={btnClass} onCancel={() => setOpen(false)} />
    </form>
  );
}

function ConfirmButtons({
  btnClass,
  onCancel,
}: {
  btnClass: string;
  onCancel: () => void;
}) {
  return (
    <div className="mt-2 flex gap-2">
      <button
        type="submit"
        className={`${btnClass} bg-red-600 text-white hover:bg-red-700`}
      >
        Da, anulează
      </button>
      <button
        type="button"
        onClick={onCancel}
        className={`${btnClass} border border-zinc-300 bg-white text-zinc-700`}
      >
        Renunță
      </button>
    </div>
  );
}
