import { Link } from "@/i18n/navigation";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { countNewRequests, listNewRequestsPreview } from "@/services/bookings/queries";
import { getAdminUser } from "@/lib/auth/require-admin";
import { PhoneBookingForm } from "./PhoneBookingForm";
import { getTranslations } from "next-intl/server";

export async function AdminQuickPanel({
  checkInTime,
  checkOutTime,
  adminVerified = false,
}: {
  checkInTime: string;
  checkOutTime: string;
  /** Parent already verified admin session (e.g. reception page). */
  adminVerified?: boolean;
}) {
  if (!adminVerified) {
    const admin = await getAdminUser();
    if (!admin) {
      await redirect("/admin/login?next=/receptie");
    }
  }

  const [t, requestsBundle] = await Promise.all([
    getTranslations("public.staffPanel"),
    Promise.all([countNewRequests(), listNewRequestsPreview(10)])
      .then(([total, preview]) => ({ total, preview }))
      .catch(() => ({ total: 0, preview: [] as Awaited<ReturnType<typeof listNewRequestsPreview>> })),
  ]);
  const requestTotal = requestsBundle.total;
  const requests = requestsBundle.preview;

  return (
    <section
      id="reception"
      className="scroll-mt-20 rounded-xl border border-zinc-800/10 bg-zinc-900 text-zinc-100 shadow-lg"
    >
      <div className="border-b border-zinc-700/80 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          {t("badge")}
        </p>
        <h2 className="text-sm font-semibold">{t("title")}</h2>
      </div>

      <div className="admin-quick-panel grid gap-4 p-4 lg:grid-cols-2">
        <div className="rounded-lg bg-zinc-800/50 p-4">
          <p className="mb-3 text-xs font-medium text-zinc-300">
            {t("phoneTitle")}
          </p>
          <PhoneBookingForm checkInTime={checkInTime} checkOutTime={checkOutTime} />
        </div>

        <div className="rounded-lg bg-zinc-800/50 p-4">
          <p className="mb-3 flex items-center justify-between text-xs font-medium text-zinc-300">
            <span>{t("pendingTitle")}</span>
            {requestTotal > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {requestTotal}
              </span>
            )}
          </p>
          {requestTotal === 0 ? (
            <p className="text-xs text-zinc-500">{t("noRequests")}</p>
          ) : (
            <ul className="max-h-48 space-y-2 overflow-y-auto">
              {requests.map((c) => (
                <li
                  key={c.id}
                  className="admin-quick-panel__row flex items-center justify-between gap-2 rounded-md bg-zinc-900/80 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-medium text-white">{c.guest_name}</p>
                    <p className="text-zinc-400">
                      {formatStayPeriod(c.check_in, c.check_out)}
                    </p>
                  </div>
                  <Link
                    href={`/calendar/confirm/${c.id}`}
                    className="admin-quick-panel__confirm-link shrink-0 rounded-md bg-emerald-600 px-2.5 py-1 font-medium text-white hover:bg-emerald-500"
                  >
                    {t("confirm")}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/admin/calendar"
            className="mt-3 inline-block text-[11px] text-zinc-400 underline hover:text-zinc-200"
          >
            {t("fullCalendar")}
          </Link>
        </div>
      </div>
    </section>
  );
}
