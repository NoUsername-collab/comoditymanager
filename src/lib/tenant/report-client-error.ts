"use client";

type ClientErrorPayload = {
  message: string;
  stack?: string | null;
  digest?: string | null;
  path?: string | null;
  boundary?: string | null;
};

/**
 * Raportează erori client-side în dev_logs (tenant host → Hospira admin logs).
 * Fire-and-forget — nu aruncă.
 */
export function reportTenantClientError(
  error: Error & { digest?: string },
  boundary?: string
): void {
  const payload: ClientErrorPayload = {
    message: error.message || "Unknown client error",
    stack: error.stack ?? null,
    digest: error.digest ?? null,
    path: typeof window !== "undefined" ? window.location.pathname : null,
    boundary: boundary ?? null,
  };

  const endpoint =
    typeof window !== "undefined"
      ? new URL("/api/tenant-error", window.location.origin).href
      : "/api/tenant-error";

  void fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Never surface logging failures to the user
  });
}
