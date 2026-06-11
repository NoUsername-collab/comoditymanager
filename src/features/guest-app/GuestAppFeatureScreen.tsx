import { Link } from "@/i18n/navigation";
import type {
  GuestAccessBookingSnapshot,
  GuestAppFeatureId,
  GuestAppSettings,
} from "@/domain/guest-app/types";
import { guestAppHomeHref } from "@/domain/guest-app/routes";
import { guestAppFeatureLabel } from "@/features/guest-app/feature-labels";
import { GuestAppCopyField } from "@/features/guest-app/GuestAppCopyField";
import { GreenStayMockForm } from "@/features/guest-app/GreenStayMockForm";

type Props = {
  featureId: GuestAppFeatureId;
  accessCode: string;
  settings: GuestAppSettings;
  booking: GuestAccessBookingSnapshot;
};

function MockBanner() {
  return (
    <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
      Conținut demonstrativ — funcționalitatea completă vine în curând.
    </p>
  );
}

export function GuestAppFeatureScreen({
  featureId,
  accessCode,
  settings,
  booking,
}: Props) {
  const { content } = settings;
  const title = guestAppFeatureLabel(featureId);

  return (
    <div className="space-y-4">
      <Link
        href={guestAppHomeHref(accessCode)}
        className="inline-flex text-sm text-zinc-400 hover:text-zinc-200"
      >
        ← Înapoi
      </Link>
      <h1 className="text-xl font-semibold">{title}</h1>
      <MockBanner />

      {featureId === "hotel_info" ? (
        <div className="space-y-3 text-sm text-zinc-300">
          {content.hotel?.longDescription ?? content.hotel?.shortDescription ? (
            <p className="leading-relaxed">
              {content.hotel.longDescription ?? content.hotel.shortDescription}
            </p>
          ) : null}
          {content.hotel?.address ? (
            <p>
              <span className="text-zinc-500">Adresă: </span>
              {content.hotel.address}
            </p>
          ) : null}
          {content.hotel?.phone ? (
            <p>
              <span className="text-zinc-500">Telefon: </span>
              {content.hotel.phone}
            </p>
          ) : null}
          {content.hotel?.email ? (
            <p>
              <span className="text-zinc-500">Email: </span>
              {content.hotel.email}
            </p>
          ) : null}
          {content.hotel?.website ? (
            <p>
              <span className="text-zinc-500">Web: </span>
              {content.hotel.website}
            </p>
          ) : null}
        </div>
      ) : null}

      {featureId === "wifi" && content.wifi ? (
        <div className="space-y-3">
          {content.wifi.networkName ? (
            <GuestAppCopyField
              label="Rețea Wi-Fi"
              value={content.wifi.networkName}
            />
          ) : null}
          {content.wifi.password ? (
            <GuestAppCopyField label="Parolă" value={content.wifi.password} />
          ) : null}
          {content.wifi.instructions ? (
            <p className="text-sm text-zinc-400">{content.wifi.instructions}</p>
          ) : null}
        </div>
      ) : null}

      {featureId === "travel_tips" ? (
        <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-300">
          {(content.travelTips ?? []).map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      ) : null}

      {featureId === "green_stay" ? (
        <GreenStayMockForm description={content.greenStay?.description} />
      ) : null}

      {featureId === "gallery" ? (
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="flex aspect-[4/3] items-center justify-center rounded-xl border border-white/10 bg-zinc-900/50 text-xs text-zinc-500"
            >
              Foto demo {n}
            </div>
          ))}
        </div>
      ) : null}

      {featureId === "online_checkin" ? (
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 text-sm text-zinc-300">
          <p>
            Check-in online pentru <strong>{booking.guestName}</strong> — formular
            demo. La recepție veți completa datele oficiale.
          </p>
          <button
            type="button"
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-xl border border-zinc-700 px-4 py-3 text-zinc-500"
          >
            Începe check-in (în curând)
          </button>
        </div>
      ) : null}

      {(featureId === "services" || featureId === "facilities") ? (
        <ul className="space-y-2 text-sm text-zinc-300">
          <li className="rounded-xl border border-white/10 px-4 py-3">
            Mic dejun — 08:00–10:30 (demo)
          </li>
          <li className="rounded-xl border border-white/10 px-4 py-3">
            Parcare — inclusă (demo)
          </li>
          <li className="rounded-xl border border-white/10 px-4 py-3">
            Wellness / saună — cu programare (demo)
          </li>
        </ul>
      ) : null}
    </div>
  );
}
