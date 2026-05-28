"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { updateBookingGuestPhoneAction } from "@/app/[locale]/admin/(panel)/bookings/actions";
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
    <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-3">
      <p className="text-sm font-bold text-red-950">{tPage("phoneRequiredTitle")}</p>
      <p className="mt-1 text-xs text-red-900/90">{tPage("phoneRequiredHint")}</p>
      <form onSubmit={savePhone} className="mt-3 flex flex-wrap gap-2">
        <label className="min-w-[200px] flex-1 text-xs font-semibold text-red-950">
          {tCommon("phone")}
          <input
            name="guest_phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded border border-red-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
            placeholder="07xx xxx xxx"
            disabled={pending}
          />
        </label>
        <div className="flex items-end">
          <AdminSubmitButton
            type="submit"
            className="rounded-md bg-red-900 px-3 py-1.5 text-xs font-semibold text-white"
            pendingLabel={tCommon("saving")}
            disabled={pending}
          >
            {tPage("phoneRequiredSave")}
          </AdminSubmitButton>
        </div>
      </form>
    </div>
  );
}
