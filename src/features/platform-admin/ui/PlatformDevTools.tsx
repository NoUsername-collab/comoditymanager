"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { revalidatePlatformAdminCacheAction } from "@/features/platform-admin/dev-actions";
import type { MigrationMarker } from "@/lib/platform-admin/migration-audit";

export function PlatformDevTools({
  migrations,
}: {
  migrations: MigrationMarker[];
}) {
  const t = useTranslations("platformAdmin.devTools");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const failed = migrations.filter((m) => !m.ok);

  const handleRevalidate = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await revalidatePlatformAdminCacheAction();
      if (result.success) {
        setMessage(t("revalidateSuccess"));
      } else {
        setMessage(result.error ?? t("revalidateFailed"));
      }
    });
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3.5">
      <h2 className="text-base font-semibold">{t("title")}</h2>
      <p className="mt-1 text-xs text-neutral-500">{t("lead")}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleRevalidate}
          disabled={pending}
          className="inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-600 hover:bg-neutral-700 disabled:opacity-50"
        >
          {pending ? t("revalidating") : t("revalidateCache")}
        </button>
        {message && (
          <span className="text-xs text-neutral-400" role="status">
            {message}
          </span>
        )}
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-medium text-neutral-300">
          {t("migrationsTitle")}
          {failed.length === 0 ? (
            <span className="ml-2 rounded-full bg-emerald-900 px-2 py-0.5 text-xs text-emerald-300">
              {t("migrationsOk")}
            </span>
          ) : (
            <span className="ml-2 rounded-full bg-red-900 px-2 py-0.5 text-xs text-red-300">
              {t("migrationsMissing", { count: failed.length })}
            </span>
          )}
        </h3>
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
          {migrations.map((marker) => (
            <li
              key={`${marker.id}-${marker.label}`}
              className={`flex items-center gap-2 rounded px-2 py-1 ${
                marker.ok ? "text-neutral-400" : "bg-red-950/30 text-red-300"
              }`}
            >
              <span aria-hidden>{marker.ok ? "✓" : "✗"}</span>
              <span className="font-mono text-neutral-500">{marker.id}</span>
              <span>{marker.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
