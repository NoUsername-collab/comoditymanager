import { getTranslations } from "next-intl/server";

type Props = {
  phone?: string | null;
  address?: string | null;
};

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export async function GuestAppQuickActions({ phone, address }: Props) {
  const t = await getTranslations("guestApp.home");
  const hasPhone = Boolean(phone?.trim());
  const hasAddress = Boolean(address?.trim());
  if (!hasPhone && !hasAddress) return null;

  return (
    <div className="guest-app__quick-actions">
      {hasPhone ? (
        <a href={`tel:${phone!.trim()}`} className="guest-app__quick-action">
          <span aria-hidden>📞</span>
          <span>{t("callReception")}</span>
        </a>
      ) : null}
      {hasAddress ? (
        <a
          href={mapsUrl(address!.trim())}
          target="_blank"
          rel="noopener noreferrer"
          className="guest-app__quick-action"
        >
          <span aria-hidden>📍</span>
          <span>{t("getDirections")}</span>
        </a>
      ) : null}
    </div>
  );
}
