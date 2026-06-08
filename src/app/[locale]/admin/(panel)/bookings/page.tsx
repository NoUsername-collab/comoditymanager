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

        <ul className="cerere-list">
          {cereri.map((c) => (
            <li key={c.id} className="cerere-item">
              <div className="cerere-item__head">
                <div className="cerere-item__lead">
                  <p className="cerere-item__name">{c.guest_name}</p>
                  <p className="cerere-item__dates">
                    {formatStayPeriod(c.check_in, c.check_out)}
                  </p>
                </div>
                <Link
                  href={`/admin/bookings/${c.id}`}
                  className="cerere-item__action admin-cereri-fill"
                >
                  {t("process")}
                </Link>
              </div>

              <div className="cerere-item__body">
                <p className="cerere-item__guests">
                  {c.num_adults} {t("adultsShort")}
                  {" · "}
                  {c.num_children} {t("childrenShort")}
                </p>
                {c.guest_email ? (
                  <p className="cerere-item__email" title={c.guest_email}>
                    {c.guest_email}
                  </p>
                ) : null}
                {c.guest_id ? (
                  <Link
                    href={`/admin/guests/${c.guest_id}`}
                    className="cerere-item__profile-link"
                  >
                    {t("openClientProfile")} →
                  </Link>
                ) : null}
              </div>

              <GuestProfileBadges
                variant="cerere"
                profile={c.guest_profile}
                alertLevel={c.guest_alert_level}
                alertNote={c.guest_alert_note}
              />
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

