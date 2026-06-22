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
      surface="nestio-admin"
      className="ml-shell--nestio-admin min-h-dvh bg-neutral-950 text-neutral-100"
    >
      <header className="nestio-admin-header border-b border-neutral-800 bg-neutral-900">
        <div className="nestio-admin-header__inner mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2.5">
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
            className="nestio-admin-header__nav--wide hidden items-center gap-4 text-sm md:flex"
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

          <span className="nestio-admin-header__email shrink-0 text-sm text-neutral-500">
            {admin.email}
          </span>
        </div>
      </header>

      <MobileContent
        as="main"
        className="nestio-admin-main mx-auto max-w-7xl px-4 py-5"
      >
        {children}
      </MobileContent>
    </MobileShell>
  );
}
