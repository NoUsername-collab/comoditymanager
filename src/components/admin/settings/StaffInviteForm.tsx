"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput, AdminSelect } from "@/components/admin/ui/AdminInput";
import { inviteStaffAction } from "@/app/[locale]/admin/(panel)/settings/staff/actions";

export function StaffInviteForm() {
  const t = useTranslations("admin.pages.staffManagement");
  const tCommon = useTranslations("admin.common");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <form
      className="admin-staff-invite"
      action={async (formData) => {
        setPending(true);
        setError(null);
        setSuccess(null);
        try {
          const result = await inviteStaffAction(formData);
          if (!result.ok) {
            setError(result.error);
          } else {
            setSuccess(t("inviteSuccess"));
            // Reset form
            const form = document.querySelector<HTMLFormElement>(
              ".admin-staff-invite"
            );
            form?.reset();
          }
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="admin-staff-invite__fields">
        <div className="admin-staff-invite__field">
          <label
            htmlFor="staff-email"
            className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1"
          >
            {t("emailLabel")}
          </label>
          <AdminInput
            id="staff-email"
            name="email"
            type="email"
            required
            placeholder={t("emailPlaceholder")}
          />
        </div>

        <div className="admin-staff-invite__field">
          <label
            htmlFor="staff-role"
            className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1"
          >
            {t("roleLabel")}
          </label>
          <AdminSelect
            id="staff-role"
            name="role"
            defaultValue="operator"
          >
            <option value="operator">{t("roleOperator")}</option>
            <option value="admin">{t("roleAdmin")}</option>
          </AdminSelect>
          <p className="text-xs text-zinc-400 mt-1">{t("roleHint")}</p>
        </div>

        <div className="admin-staff-invite__submit">
          <AdminButton type="submit" variant="primary" disabled={pending}>
            {pending ? tCommon("saving") : t("inviteButton")}
          </AdminButton>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-2 text-sm text-green-700" role="status">
          {success}
        </p>
      )}
    </form>
  );
}
