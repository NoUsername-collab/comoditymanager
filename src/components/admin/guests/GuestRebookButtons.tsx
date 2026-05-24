"use client";

import { useTransition } from "react";
import {
  rebookLastStayAction,
  rebookNextYearAction,
} from "@/app/admin/(panel)/guests/actions";

function RebookButton({
  guestId,
  label,
  action,
  variant = "primary",
}: {
  guestId: string;
  label: string;
  action: (formData: FormData) => Promise<void>;
  variant?: "primary" | "secondary";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(() => action(fd))}
      onSubmit={(e) => {
        if (
          !confirm(
            `${label}? Se creează o cerere nouă cu aceleași camere (dacă sunt libere).`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="guest_id" value={guestId} />
      <button
        type="submit"
        disabled={pending}
        className={
          variant === "primary"
            ? "admin-cereri-fill px-4 py-2 text-sm font-medium disabled:opacity-60"
            : "rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
        }
      >
        {pending ? "…" : label}
      </button>
    </form>
  );
}

export function GuestRebookButtons({ guestId }: { guestId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <RebookButton
        guestId={guestId}
        label="Rebook ultimul sejur"
        action={rebookLastStayAction}
      />
      <RebookButton
        guestId={guestId}
        label="Aceeași perioadă an viitor"
        action={rebookNextYearAction}
        variant="secondary"
      />
    </div>
  );
}
