import Link from "next/link";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next?.startsWith("/admin") ? params.next : "/admin";

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
          Casa Emil
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Admin</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Acces doar pentru administrator.
        </p>
        <AdminLoginForm next={next} />
        <Link
          href="/"
          className="mt-6 block text-center text-xs text-zinc-500 hover:text-zinc-800"
        >
          ← Înapoi la site
        </Link>
      </div>
    </main>
  );
}
