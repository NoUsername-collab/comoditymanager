"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { inviteStaffAction } from "@/app/[locale]/admin/(panel)/settings/staff/actions";

export function StaffInviteForm() {
  const t = useTranslations("admin.pages.staffManagement");
  const tCommon = useTranslations("admin.common");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <form
      className="admin-staff-invite settings-form-stack"
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
            const form = document.querySelector<HTMLFormElement>(
              ".admin-staff-invite",
            );
            form?.reset();
          }
        } finally {
          setPending(false);
        }
      }}
    >
      {error || success ? (
        <div className="settings-alerts">
          {error ? (
            <p className="settings-alerts__item settings-alerts__item--error" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="settings-alerts__item settings-alerts__item--success" role="status">
              {success}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="admin-staff-invite__fields">
        <div className="admin-staff-invite__field admin-settings-fields">
          <label htmlFor="staff-email">
            <span>{t("emailLabel")}</span>
            <input
              id="staff-email"
              name="email"
              type="email"
              required
              placeholder={t("emailPlaceholder")}
            />
          </label>
        </div>

        <div className="admin-staff-invite__field admin-settings-fields">
          <label htmlFor="staff-role">
            <span>{t("roleLabel")}</span>
            <select id="staff-role" name="role" defaultValue="operator">
              <option value="operator">{t("roleOperator")}</option>
              <option value="admin">{t("roleAdmin")}</option>
            </select>
            <p className="admin-settings-hint">{t("roleHint")}</p>
          </label>
        </div>

        <div className="admin-staff-invite__submit">
          <AdminButton type="submit" variant="primary" size="lg" disabled={pending}>
            {pending ? tCommon("saving") : t("inviteButton")}
          </AdminButton>
        </div>
      </div>
    </form>
  );
}
