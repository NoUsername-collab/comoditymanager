import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/app/admin/login/actions";

/** Doar când ești logat — oaspeții nu văd niciun link Admin. */
export async function AdminCorner() {
  let isAdmin = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isAdmin = !!user;
  } catch {
    isAdmin = false;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="fixed right-4 top-3 z-50 flex items-center gap-0.5 rounded-full border border-[var(--site-border)] bg-[var(--site-header-bg)] px-1 py-1 text-[11px] shadow-md backdrop-blur-sm">
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
