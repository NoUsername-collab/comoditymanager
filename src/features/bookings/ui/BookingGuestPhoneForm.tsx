"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { updateBookingGuestPhoneAction } from "@/features/bookings/actions";
import {
  useAdminPending,
  useRunAdminAction,
} from "@/components/admin/feedback/AdminPendingProvider";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { isValidGuestPhone } from "@/domain/guest/normalize";

export function BookingGuestPhoneForm({
  bookingId,
  defaultPhone,
}: {
  bookingId: string;
  defaultPhone?: string | null;
}) {
  const router = useRouter();
  const tPage = useTranslations("admin.pages.bookingDetail");
  const tCommon = useTranslations("admin.common");
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();
  const { showToast } = useAdminFx();
  const [phone, setPhone] = useState(
    defaultPhone?.trim() && defaultPhone !== "—" ? defaultPhone : ""
  );

  if (isValidGuestPhone(defaultPhone)) return null;

  function savePhone(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("id", bookingId);
    fd.set("guest_phone", phone);
    void runAdminAction(async () => {
      const res = await updateBookingGuestPhoneAction(fd);
      if (!res.ok) {
        showToast({ kind: "error", title: tCommon("error"), message: res.error });
        return;
      }
      showToast({
        kind: "success",
        title: tPage("phoneRequiredSave"),
        message: phone,
      });
      router.refresh();
    });
  }

  return (
    <div className="bd-phone-warn">
      <div className="bd-phone-warn__header">
        <span className="bd-phone-warn__icon" aria-hidden>!</span>
        <div>
          <p className="bd-phone-warn__title">{tPage("phoneRequiredTitle")}</p>
          <p className="bd-phone-warn__hint">{tPage("phoneRequiredHint")}</p>
        </div>
      </div>
      <form onSubmit={savePhone} className="bd-phone-warn__form">
        <label className="bd-phone-warn__label">
          {tCommon("phone")}
          <input
            name="guest_phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="bd-phone-warn__input"
            placeholder="07xx xxx xxx"
            disabled={pending}
          />
        </label>
        <AdminSubmitButton
          type="submit"
          className="bd-phone-warn__save"
          pendingLabel={tCommon("saving")}
          disabled={pending}
        >
          {tPage("phoneRequiredSave")}
        </AdminSubmitButton>
      </form>
    </div>
  );
}
