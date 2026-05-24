"use client";

import { useState } from "react";
import {
  lockLocationAdminAction,
  unlockLocationAdminAction,
} from "@/app/admin/(panel)/settings/actions";

export function AdminLocationUnlockForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="admin-location-unlock space-y-3"
      action={async (formData) => {
        setPending(true);
        setError(null);
        try {
          const result = await unlockLocationAdminAction(formData);
          if (result?.error) setError(result.error);
        } finally {
          setPending(false);
        }
      }}
    >
      <p className="text-sm text-zinc-600">
        Introdu parola contului <strong>Admin</strong> pentru a configura
        clădiri, camere, ore check-in și conturi staff. Sesiunea durează 2 ore.
      </p>
      <label className="block text-sm">
        Parolă admin
        <input
          name="admin_password"
          type="password"
          autoComplete="current-password"
          className="mt-1 w-full max-w-sm rounded-lg border border-zinc-300 px-3 py-2"
          required
        />
      </label>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Se verifică…" : "Deschide administrare locație"}
      </button>
    </form>
  );
}

export function AdminLocationLockButton() {
  const [pending, setPending] = useState(false);

  return (
    <form
      action={async () => {
        setPending(true);
        try {
          await lockLocationAdminAction();
        } finally {
          setPending(false);
        }
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
      >
        {pending ? "Se închide…" : "Închide administrare locație"}
      </button>
    </form>
  );
}
