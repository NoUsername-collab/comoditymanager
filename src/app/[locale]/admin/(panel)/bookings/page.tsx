import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { GuestProfileBadges } from "@/components/admin/guests/GuestProfileBadges";
import { listCereriNoi } from "@/services/bookings";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";

export default async function AdminBookingsPage() {
  const t = await getTranslations("admin.pages.bookings");
  let cereri: Awaited<ReturnType<typeof listCereriNoi>> = [];
  let error: string | null = null;

  try {
    cereri = await listCereriNoi();
  } catch (e) {
    error = e instanceof Error ? e.message : t("genericError");
  }

  return (
    <AdminRetroPageFrame title={t("title")} description={t("description")}>
      <RetroXpWindow title={t("windowTitle", { count: cereri.length })}>
        {error && <p className="text-sm text-red-800">{error}</p>}

        <ul className="space-y-2">
          {cereri.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-zinc-200 bg-white px-4 py-3"
            >
              <div>
                <p className="font-semibold">{c.guest_name}</p>
                <p className="text-sm">
                  {formatStayPeriod(c.check_in, c.check_out)} · {c.num_adults} {t("adultsShort")} + {" "}
                  {c.num_children} {t("childrenShort")}
                </p>
                <p className="text-xs">{c.guest_email}</p>
                {c.guest_id && (
                  <p className="mt-1 text-xs">
                    <Link href={`/admin/guests/${c.guest_id}`} className="font-semibold text-emerald-700 hover:underline">
                      {t("openClientProfile")} →
                    </Link>
                  </p>
                )}
                <GuestProfileBadges
                  profile={c.guest_profile}
                  alertLevel={c.guest_alert_level}
                  alertNote={c.guest_alert_note}
                />
              </div>
              <Link
                href={`/admin/bookings/${c.id}`}
                className="admin-cereri-fill px-4 py-2 text-sm font-medium"
              >
                {t("process")}
              </Link>
            </li>
          ))}
        </ul>

        {cereri.length === 0 && !error && (
          <AdminEmptyState
            emoji="?"
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            actionHref="/calendar"
            actionLabel={t("emptyAction")}
          />
        )}
      </RetroXpWindow>
    </AdminRetroPageFrame>
  );
}

