"use client";

import { useState } from "react";
import { changeStaffPasswordAction } from "@/app/admin/(panel)/settings/actions";
import type { StaffAccount } from "@/services/staff-accounts";

export function AdminStaffPasswordPanel({
  accounts,
}: {
  accounts: StaffAccount[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
          if (result?.ok) setSuccess("Parola a fost actualizată.");
        } finally {
          setPending(false);
        }
      }}
    >
      <label>
        <span>Cont staff</span>
        <select name="staff_email" required defaultValue={accounts[0]?.email}>
          {accounts.map((a) => (
            <option key={a.email} value={a.email}>
              {a.loginUsername} ({a.role}) — {a.email}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Parolă nouă</span>
        <input
          name="new_password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="admin-settings-hint">Minim 8 caractere.</p>
      </label>
      <label>
        <span>Confirmă parola</span>
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
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Se salvează…" : "Schimbă parola"}
      </button>
    </form>
  );
}
