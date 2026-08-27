"use client";

import {
  rebookLastStayAction,
  rebookNextYearAction,
} from "@/features/guests/actions";
import { useTranslations } from "next-intl";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";

function RebookButton({
  guestId,
  label,
  action,
  variant = "primary",
  disabled = false,
}: {
  guestId: string;
  label: string;
  action: (formData: FormData) => Promise<void>;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  const tGuests = useTranslations("admin.guests");
  const tCommon = useTranslations("admin.common");
  return (
    <AdminPendingForm
      action={action}
      onSubmit={(e) => {
        if (
          !confirm(
            tGuests("rebook.confirm", { label })
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="guest_id" value={guestId} />
      <AdminSubmitButton
        type="submit"
        pendingLabel={tCommon("checking")}
        disabled={disabled}
        className={
          variant === "primary"
            ? "guest-rebook-buttons__submit admin-cereri-fill px-4 py-2 text-sm font-medium disabled:opacity-60"
            : "guest-rebook-buttons__submit rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
        }
      >
        {label}
      </AdminSubmitButton>
    </AdminPendingForm>
  );
}

export function GuestRebookButtons({
  guestId,
  disabled = false,
}: {
  guestId: string;
  disabled?: boolean;
}) {
  const tGuests = useTranslations("admin.guests");
  return (
    <div className="guest-rebook-buttons flex flex-wrap gap-2">
      <RebookButton
        guestId={guestId}
        label={tGuests("rebook.lastStay")}
        action={rebookLastStayAction}
        disabled={disabled}
      />
      <RebookButton
        guestId={guestId}
        label={tGuests("rebook.samePeriodNextYear")}
        action={rebookNextYearAction}
        variant="secondary"
        disabled={disabled}
      />
    </div>
  );
}
