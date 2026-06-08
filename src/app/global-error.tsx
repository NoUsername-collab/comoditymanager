"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Global error boundary — catches root layout crashes that no other
 * error.tsx can handle (import failures, provider crashes, etc.).
 *
 * Without this, the user sees a white screen of death.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    void import("@/lib/tenant/report-client-error").then(({ reportTenantClientError }) =>
      reportTenantClientError(error, "global")
    );
  }, [error]);

  return (
    <html lang="ro">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          backgroundColor: "#07060a",
          color: "#f3efe3",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: "480px" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
            Ceva nu a mers bine
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              opacity: 0.7,
              lineHeight: 1.6,
              marginBottom: "1.5rem",
            }}
          >
            A apărut o eroare neașteptată. Echipa a fost notificată automat.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.625rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              backgroundColor: "#d6b55a",
              color: "#0b0a0f",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Reîncearcă
          </button>
          {error.digest && (
            <p
              style={{
                marginTop: "1.5rem",
                fontSize: "0.75rem",
                opacity: 0.4,
              }}
            >
              Cod eroare: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
