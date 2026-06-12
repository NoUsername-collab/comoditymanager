"use client";

import { useEffect } from "react";
import { reportTenantClientError } from "@/lib/tenant/report-client-error";

export default function GuestStayError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportTenantClientError(error, "guest-stay");
  }, [error]);

  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-lg font-semibold text-red-100">Acces indisponibil</h1>
      <p className="mt-2 max-w-md text-sm text-red-200/90">
        Pagina guest app nu s-a putut încărca. Verificați linkul primit de la
        pensiune sau contactați recepția.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white"
      >
        Reîncearcă
      </button>
      {error.digest ? (
        <p className="mt-3 text-xs text-white/40">Cod: {error.digest}</p>
      ) : null}
    </div>
  );
}
