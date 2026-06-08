"use client";

import { useEffect } from "react";
import { reportTenantClientError } from "@/lib/tenant/report-client-error";

export default function AdminPanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportTenantClientError(error, "admin-panel");
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 text-center">
      <h2 className="text-base font-bold text-zinc-900">Eroare în această secțiune</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-600">
        Secțiunea nu s-a putut încărca. Poți reîncerca sau reveni la pagina
        principală admin.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Reîncearcă
        </button>
        <a
          href="/admin"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800"
        >
          Acasă admin
        </a>
      </div>
      {error.digest && (
        <p className="mt-3 text-xs text-zinc-400">Cod: {error.digest}</p>
      )}
    </div>
  );
}
