import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { PLATFORM_NAME } from "@/lib/platform/branding";
import { Link } from "@/i18n/navigation";
import { HospiraAdminMobileNav } from "@/layout/components/HospiraAdminMobileNav";
import { MobileContent } from "@/layout/components/MobileContent";
import { MobileShell } from "@/layout/components/MobileShell";

export default async function HospiraAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requirePlatformAdmin();

  return (
    <MobileShell
      surface="hospira-admin"
      className="ml-shell--hospira-admin min-h-screen bg-neutral-950 text-neutral-100"
    >
      <header className="hospira-admin-header border-b border-neutral-800 bg-neutral-900">
        <div className="hospira-admin-header__inner mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <HospiraAdminMobileNav />
            <Link
              href="/hospira-admin"
              className="truncate text-lg font-semibold tracking-tight text-white"
            >
              {PLATFORM_NAME}{" "}
              <span className="text-xs font-normal text-neutral-400">Admin</span>
            </Link>
          </div>

          <nav
            className="hospira-admin-header__nav--wide hidden items-center gap-4 text-sm md:flex"
            aria-label="Hospira admin"
          >
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

          <span className="hospira-admin-header__email shrink-0 text-sm text-neutral-500">
            {admin.email}
          </span>
        </div>
      </header>

      <MobileContent
        as="main"
        className="hospira-admin-main mx-auto max-w-7xl px-6 py-8"
      >
        {children}
      </MobileContent>
    </MobileShell>
  );
}
