"use client";

import { useState } from "react";
import { loginAction } from "@/app/admin/login/actions";
import { ADMIN_LOGIN_USERNAME } from "@/lib/auth/constants";

export function AdminLoginForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-8 space-y-4"
      action={async (formData) => {
        setPending(true);
        setError(null);
        try {
          const result = await loginAction(formData);
          if (result?.error) setError(result.error);
        } finally {
          setPending(false);
        }
      }}
    >
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm">
        Utilizator
        <input
          name="username"
          type="text"
          autoComplete="username"
          defaultValue={ADMIN_LOGIN_USERNAME}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          required
        />
      </label>
      <label className="block text-sm">
        Parolă
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
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
        className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Se conectează…" : "Intră în admin"}
      </button>
    </form>
  );
}
