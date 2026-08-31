import { Link } from "@/i18n/navigation";
import { logoutAction } from "@/features/auth/login";
import { getSessionUser } from "@/services/auth-session";

/** Doar când ești logat — oaspeții nu văd niciun link Admin. */
export async function AdminCorner() {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }

  return (
    <div className="admin-corner fixed right-4 top-3 z-50 flex items-center gap-0.5 rounded-full border border-[var(--site-border)] bg-[var(--site-header-bg)] px-1 py-1 text-[11px] shadow-md backdrop-blur-sm">
      <Link
        href="/admin"
        className="rounded-full px-2.5 py-1 font-medium text-[var(--site-fg)] hover:opacity-80"
      >
        Panou operator
      </Link>
      <form action={logoutAction} className="ml-0.5">
        <button
          type="submit"
          className="rounded-full px-2 py-1 text-[var(--site-muted)] hover:text-[var(--site-fg)]"
          title="Deconectare"
        >
          ⎋
        </button>
      </form>
    </div>
  );
}
