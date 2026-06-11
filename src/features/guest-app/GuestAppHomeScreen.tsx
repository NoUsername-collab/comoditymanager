import { Link } from "@/i18n/navigation";
import type {
  GuestAccessBookingSnapshot,
  GuestAppSettings,
} from "@/domain/guest-app/types";
import { guestAppFeatureHref } from "@/domain/guest-app/routes";
import {
  guestAppFeatureBadge,
  guestAppFeatureLabel,
  visibleGuestAppFeatures,
} from "@/features/guest-app/feature-labels";
import { formatStayPeriod } from "@/lib/ro-calendar";

type Props = {
  accessCode: string;
  booking: GuestAccessBookingSnapshot;
  settings: GuestAppSettings;
  locale: string;
};

export function GuestAppHomeScreen({
  accessCode,
  booking,
  settings,
  locale,
}: Props) {
  const features = visibleGuestAppFeatures(settings.features);
  const period = formatStayPeriod(
    booking.checkIn,
    booking.checkOut,
    locale,
    true,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-zinc-400">Bun venit</p>
        <h1 className="mt-1 text-xl font-semibold">{booking.guestName}</h1>
        <p className="mt-2 text-sm text-zinc-300">{period}</p>
        {booking.roomLabels.length > 0 ? (
          <p className="mt-1 text-sm text-zinc-400">
            {booking.roomLabels.join(" · ")}
          </p>
        ) : null}
      </section>

      {settings.content.hotel?.shortDescription ? (
        <p className="text-sm leading-relaxed text-zinc-300">
          {settings.content.hotel.shortDescription}
        </p>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Tot ce ai nevoie
        </h2>
        <ul className="grid gap-2">
          {features.map((feature) => {
            const badge = guestAppFeatureBadge(feature.state);
            return (
              <li key={feature.id}>
                <Link
                  href={guestAppFeatureHref(accessCode, feature.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-zinc-900/80 px-4 py-3 text-left transition hover:border-[var(--guest-app-accent)] hover:bg-zinc-900"
                >
                  <span className="font-medium text-zinc-100">
                    {guestAppFeatureLabel(feature.id)}
                  </span>
                  {badge ? (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                      {badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
