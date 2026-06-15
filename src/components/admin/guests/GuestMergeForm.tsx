"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { mergeGuestsAction } from "@/app/[locale]/admin/(panel)/guests/actions";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { useAdminPending } from "@/components/admin/feedback/AdminPendingProvider";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { AdminSelect } from "@/components/admin/ui/AdminInput";

export function GuestMergeForm({
  guestId,
  duplicates,
}: {
  guestId: string;
  duplicates: {
    id: string;
    display_name: string;
    email: string | null;
    phone: string | null;
  }[];
}) {
  const [selected, setSelected] = useState("");
  const { pending } = useAdminPending();
  const t = useTranslations("admin.guests.mergeForm");

  if (duplicates.length === 0) return null;

  return (
    <AdminPendingForm
      action={mergeGuestsAction}
      className="guest-merge-form mt-4 space-y-2 rounded border border-amber-200 bg-amber-50 p-3"
    >
      <input type="hidden" name="target_id" value={guestId} />
      <p className="text-sm font-semibold text-amber-950">
        {t("title")}
      </p>
      <AdminSelect
        name="source_id"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        required
        disabled={pending}
      >
        <option value="">{t("selectPlaceholder")}</option>
        {duplicates.map((d) => (
          <option key={d.id} value={d.id}>
            {d.display_name}
            {d.email ? ` · ${d.email}` : ""}
            {d.phone ? ` · ${d.phone}` : ""}
          </option>
        ))}
      </AdminSelect>
      <AdminSubmitButton
        type="submit"
        disabled={!selected}
        pendingLabel={t("pending")}
        className="rounded border border-amber-400 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-950 disabled:opacity-60"
      >
        {t("submit")}
      </AdminSubmitButton>
    </AdminPendingForm>
  );
}
