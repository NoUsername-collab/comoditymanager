import { GuestBookingForm } from "@/components/calendar/GuestBookingForm";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { getPensionSettings } from "@/services/pension-settings";

export default async function CalendarPublicPage() {
  let settings: Awaited<ReturnType<typeof getPensionSettings>> = null;
  try {
    settings = await getPensionSettings();
  } catch {
    settings = null;
  }

  const checkInTime = settings?.default_check_in_time ?? "14:00";
  const checkOutTime = settings?.default_check_out_time ?? "11:00";
  const title = settings?.display_name ?? "Casa Emil";

  return (
    <PublicPageShell
      wide
      eyebrow="Rezervare online"
      title={title}
      lead="Alege perioada, compară variantele și trimite cererea. Pensiunea vă contactează pentru confirmare."
    >
      <div className="public-booking-layout mt-8">
        <aside className="public-booking-aside">
          <p className="text-sm font-semibold text-[var(--site-fg)]">
            Ce trebuie să știi
          </p>
          <ul className="public-booking-aside__list">
            <li className="public-booking-aside__item">
              <span aria-hidden>✓</span>
              <span>
                <strong>Nu e plată online</strong>
                Prețul afișat e estimativ — confirmăm noi suma finală.
              </span>
            </li>
            <li className="public-booking-aside__item">
              <span aria-hidden>⏱</span>
              <span>
                <strong>Reținere provizorie</strong>
                Camerele din varianta aleasă sunt blocate temporar.
              </span>
            </li>
            <li className="public-booking-aside__item">
              <span aria-hidden>🕐</span>
              <span>
                <strong>Ore standard</strong>
                Check-in {checkInTime} · Check-out {checkOutTime}
              </span>
            </li>
          </ul>
        </aside>

        <GuestBookingForm
          checkInTime={checkInTime}
          checkOutTime={checkOutTime}
        />
      </div>
    </PublicPageShell>
  );
}
