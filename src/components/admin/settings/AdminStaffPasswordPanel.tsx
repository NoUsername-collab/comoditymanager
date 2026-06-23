"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { changeStaffPasswordAction } from "@/features/settings/actions";
import type { StaffAccount } from "@/services/staff-accounts";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";

function roleLabel(
  role: StaffAccount["role"],
  tStaff: ReturnType<typeof useTranslations<"admin.pages.staffManagement">>,
): string {
  if (role === "owner") return tStaff("roleOwnerTitle");
  if (role === "admin") return tStaff("roleAdminTitle");
  return tStaff("roleOperatorTitle");
}

export function AdminStaffPasswordPanel({
  accounts,
}: {
  accounts: StaffAccount[];
}) {
  const tPage = useTranslations("admin.pages.settingsLocation.staffPanel");
  const tStaff = useTranslations("admin.pages.staffManagement");
  const tCommon = useTranslations("admin.common");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (accounts.length === 0) {
    return (
      <div className="settings-alerts">
        <p className="settings-alerts__item settings-alerts__item--warning">
          {tPage("noStaffForTenant")}{" "}
          <Link href="/admin/settings/staff" className="font-semibold underline">
            {tPage("inviteStaffLink")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      className="admin-staff-password-panel settings-form-stack"
      action={async (formData) => {
        setPending(true);
        setError(null);
        setSuccess(null);
        try {
          const result = await changeStaffPasswordAction(formData);
          if (result?.error) setError(result.error);
          if (result?.ok) setSuccess(tPage("passwordUpdated"));
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

      <p className="admin-settings-hint">{tPage("tenantStaffHint")}</p>

      <div className="admin-settings-fields">
        <label>
          <span>{tPage("staffAccount")}</span>
          <select name="staff_email" required defaultValue={accounts[0]?.email}>
            {accounts.map((a) => (
              <option key={a.memberId} value={a.email}>
                {roleLabel(a.role, tStaff)} — {a.email}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{tPage("newPassword")}</span>
          <input
            name="new_password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="admin-settings-hint">{tPage("minLength")}</p>
        </label>
        <label>
          <span>{tPage("confirmPassword")}</span>
          <input
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
      </div>

      <div className="settings-form-stack__submit">
        <AdminSubmitButton variant="primary" size="lg" disabled={pending}>
          {pending ? tCommon("saving") : tPage("changePassword")}
        </AdminSubmitButton>
      </div>
    </form>
  );
}
