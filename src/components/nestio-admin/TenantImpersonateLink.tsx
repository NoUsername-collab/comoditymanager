"use client";

const PLATFORM_DOMAIN =
  process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "nestio.ro";

export function TenantImpersonateLink({ slug }: { slug: string }) {
  const isLocal =
    typeof window !== "undefined" && window.location.hostname === "localhost";

  const tenantUrl = isLocal
    ? `http://${slug}.localhost:3000/admin`
    : `https://${slug}.${PLATFORM_DOMAIN}/admin`;

  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-500">
        Deschide panoul admin al acestui tenant. Te autentifici cu contul tău.
      </p>
      <a
        href={tenantUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hospira-impersonate-link inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center gap-2 rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-600 hover:bg-neutral-700"
      >
        Deschide {slug} →
      </a>
    </div>
  );
}
