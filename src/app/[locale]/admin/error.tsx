"use client";

import { useEffect } from "react";
import { reportTenantClientError } from "@/lib/tenant/report-client-error";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportTenantClientError(error, "admin");
  }, [error]);

  return (
    <main className="admin-page-main ml-content flex min-h-[50dvh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-lg font-bold text-zinc-900">Ceva nu a mers bine</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-600">
        A apărut o eroare în panoul admin. Echipa poate vedea detaliile în
        jurnalul de erori.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 min-h-[2.75rem] rounded-lg bg-zinc-900 px-4 py-2 text-base font-semibold text-white"
      >
        Reîncearcă
      </button>
      {error.digest && (
        <p className="mt-3 text-xs text-zinc-400">Cod: {error.digest}</p>
      )}
    </main>
  );
}
