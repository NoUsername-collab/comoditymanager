import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { PLATFORM_NAME } from "@/lib/platform/branding";
import { Link } from "@/i18n/navigation";

export default async function HospiraAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Top bar */}
      <header className="border-b border-neutral-800 bg-neutral-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/hospira-admin"
              className="text-lg font-semibold tracking-tight text-white"
            >
              {PLATFORM_NAME}{" "}
              <span className="text-xs font-normal text-neutral-400">
                Admin
              </span>
            </Link>

            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/hospira-admin"
                className="text-neutral-400 transition-colors hover:text-white"
              >
                Dashboard
              </Link>
              <Link
                href="/hospira-admin/tenants"
                className="text-neutral-400 transition-colors hover:text-white"
              >
                Tenanți
              </Link>
              <Link
                href="/hospira-admin/logs"
                className="text-neutral-400 transition-colors hover:text-white"
              >
                Logs
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3 text-sm text-neutral-500">
            <span>{admin.email}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
