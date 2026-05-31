"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { changeStaffPasswordAction } from "@/app/[locale]/admin/(panel)/settings/actions";
import type { StaffAccount } from "@/services/staff-accounts";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";

function roleLabel(
  role: StaffAccount["role"],
  tStaff: ReturnType<typeof useTranslations<"admin.pages.staffManagement">>
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
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
        <p>{tPage("noStaffForTenant")}</p>
        <Link
          href="/admin/settings/staff"
          className="mt-2 inline-block font-semibold underline"
        >
          {tPage("inviteStaffLink")}
        </Link>
      </div>
    );
  }

  return (
    <form
      className="admin-settings-fields space-y-4"
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
      <p className="text-xs text-zinc-500">{tPage("tenantStaffHint")}</p>
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
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-700" role="status">
          {success}
        </p>
      )}
      <AdminSubmitButton className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
        {pending ? tCommon("saving") : tPage("changePassword")}
      </AdminSubmitButton>
    </form>
  );
}
