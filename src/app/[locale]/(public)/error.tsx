"use client";

import { useEffect } from "react";
import { reportTenantClientError } from "@/lib/tenant/report-client-error";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (error.name !== "TenantNotFoundError") {
      reportTenantClientError(error, "public");
    }
  }, [error]);

  const isTenantMissing = error.name === "TenantNotFoundError";

  if (isTenantMissing) {
    return (
      <main className="public-section" style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <h1>Pensiune negăsită</h1>
        <p>
          Subdomeniul nu este înregistrat încă. Verifică adresa sau{" "}
          <a href="https://zalmox.app/signup">înscrie pensiunea</a>.
        </p>
      </main>
    );
  }

  return (
    <main className="public-section" style={{ textAlign: "center", padding: "4rem 1rem" }}>
      <h1>Ceva nu a mers bine</h1>
      <p>Pagina nu s-a putut încărca. Reîncercați sau contactați pensiunea.</p>
      <button type="button" onClick={reset} className="public-btn">
        Reîncearcă
      </button>
    </main>
  );
}
