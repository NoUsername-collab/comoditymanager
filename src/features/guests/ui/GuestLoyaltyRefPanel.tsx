"use client";

import { useTranslations } from "next-intl";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { reissueGuestLoyaltyRefAction } from "@/features/guests/actions";

export function GuestLoyaltyRefPanel({
  guestId,
  reference,
  programEnabled,
}: {
  guestId: string;
  reference: string | null;
  programEnabled: boolean;
}) {
  const t = useTranslations("admin.guests.loyalty");
  const tCommon = useTranslations("admin.common");

  return (
    <div className="guest-loyalty-admin">
      <p className="guest-panel__hint">{t("hint")}</p>
      {reference ? (
        <p className="guest-loyalty-admin__ref">
          <span>{t("referenceLabel")}</span>
          <code>{reference}</code>
        </p>
      ) : (
        <p className="guest-panel__hint">{t("missing")}</p>
      )}
      {programEnabled ? (
        <AdminPendingForm action={reissueGuestLoyaltyRefAction}>
          <input type="hidden" name="guest_id" value={guestId} />
          <AdminSubmitButton
            type="submit"
            pendingLabel={tCommon("saving")}
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            {reference ? t("reissue") : t("issue")}
          </AdminSubmitButton>
        </AdminPendingForm>
      ) : (
        <p className="guest-panel__hint">{t("enableInGuestApp")}</p>
      )}
    </div>
  );
}
