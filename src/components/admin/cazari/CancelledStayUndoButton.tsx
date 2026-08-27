"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { undoBookingCancellationAction } from "@/features/activity/actions";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";

function UndoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M3.5 5.5h6a3.5 3.5 0 0 1 0 7H7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 3 3.5 5.5 6 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CancelledStayUndoButton({
  bookingId,
  label,
  confirmLabel,
  className = "",
}: {
  bookingId: string;
  label: string;
  confirmLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const { showToast } = useAdminFx();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      className={[
        "activity-undo-btn activity-undo-btn--stay-card",
        pending && "activity-undo-btn--pending",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => {
        if (!window.confirm(confirmLabel)) return;
        setPending(true);
        void undoBookingCancellationAction(bookingId).then((res) => {
          setPending(false);
          if (res.ok) {
            router.refresh();
            showToast({
              kind: "info",
              title: label,
              message: "",
            });
          } else {
            showToast({
              kind: "error",
              title: label,
              message: res.error,
            });
          }
        });
      }}
    >
      <UndoIcon className="activity-undo-btn__icon" />
      <span>{pending ? "..." : label}</span>
    </button>
  );
}
