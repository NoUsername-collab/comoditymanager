"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
          <input
            id="staff-email"
            name="email"
            type="email"
            required
            placeholder={t("emailPlaceholder")}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300"
          />
        </div>

        <div className="admin-staff-invite__field">
          <label
            htmlFor="staff-role"
            className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1"
          >
            {t("roleLabel")}
          </label>
          <select
            id="staff-role"
            name="role"
            defaultValue="operator"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300"
          >
            <option value="operator">{t("roleOperator")}</option>
            <option value="admin">{t("roleAdmin")}</option>
          </select>
          <p className="text-xs text-zinc-400 mt-1">{t("roleHint")}</p>
        </div>

        <div className="admin-staff-invite__submit">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {pending ? tCommon("saving") : t("inviteButton")}
          </button>
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
