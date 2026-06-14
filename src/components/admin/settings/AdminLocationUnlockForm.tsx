"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";
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
        <AdminInput
          name="owner_password"
          type="password"
          autoComplete="current-password"
          className="mt-1 max-w-sm"
          required
        />
      </label>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <AdminButton type="submit" variant="primary" disabled={pending}>
        {pending ? tPage("checking") : tPage("openLocationAdmin")}
      </AdminButton>
    </form>
  );
}

export function AdminLocationLockButton() {
  const tPage = useTranslations("admin.pages.settingsLocation.unlock");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="admin-location-lock-form"
      action={async () => {
        setPending(true);
        try {
          await lockLocationAdminAction();
        } finally {
          setPending(false);
        }
      }}
    >
      <AdminButton type="submit" variant="secondary" disabled={pending}>
        {pending ? tPage("closing") : tPage("closeLocationAdmin")}
      </AdminButton>
    </form>
  );
}
