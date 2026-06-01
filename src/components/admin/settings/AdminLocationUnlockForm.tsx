"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  lockLocationAdminAction,
  unlockLocationAdminAction,
} from "@/app/[locale]/admin/(panel)/settings/actions";

export function AdminLocationUnlockForm({ isOwner = false }: { isOwner?: boolean }) {
  const tPage = useTranslations("admin.pages.settingsLocation.unlock");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (isOwner) return null;

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
        {tPage.rich("hintHtml", { strong: (chunks) => <strong>{chunks}</strong> })}
      </p>
      <label className="block text-sm">
        {tPage("ownerPassword")}
        <input
          name="owner_password"
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
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 active:translate-y-px active:bg-zinc-950 disabled:opacity-60"
      >
        {pending ? tPage("checking") : tPage("openLocationAdmin")}
      </button>
    </form>
  );
}

export function AdminLocationLockButton() {
  const tPage = useTranslations("admin.pages.settingsLocation.unlock");
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
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 active:translate-y-px active:bg-zinc-100 disabled:opacity-60"
      >
        {pending ? tPage("closing") : tPage("closeLocationAdmin")}
      </button>
    </form>
  );
}
