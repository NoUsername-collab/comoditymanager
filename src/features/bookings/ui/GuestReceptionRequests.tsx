import { getLocale, getTranslations } from "next-intl/server";
import type { GuestReceptionRequestSnapshot } from "@/domain/guest-app/reception-request";
import { acknowledgeGuestReceptionRequestAction } from "@/features/bookings/reception-request-actions";

type Props = {
  bookingId: string;
  requests: GuestReceptionRequestSnapshot[];
};

function formatSentAt(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export async function GuestReceptionRequests({ bookingId, requests }: Props) {
  const [t, locale] = await Promise.all([
    getTranslations("admin.pages.bookingDetail"),
    getLocale(),
  ]);
  if (requests.length === 0) return null;

  return (
    <div className="bd-card bd-card--tight">
      <p className="bd-card__title">{t("guestRequests")}</p>
      <ul className="bd-guest-requests">
        {requests.map((request) => (
          <li key={request.id} className="bd-guest-requests__item">
            <p className="bd-guest-requests__message">{request.message}</p>
            <div className="bd-guest-requests__meta">
              <span>{formatSentAt(request.createdAt, locale)}</span>
              {request.status === "pending" ? (
                <form action={acknowledgeGuestReceptionRequestAction}>
                  <input type="hidden" name="requestId" value={request.id} />
                  <input type="hidden" name="bookingId" value={bookingId} />
                  <button type="submit" className="bd-ops__btn bd-ops__btn--ghost">
                    {t("guestRequestSeen")}
                  </button>
                </form>
              ) : (
                <span>{t("guestRequestAlreadySeen")}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
