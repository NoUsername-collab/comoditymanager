"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatStayPeriod } from "@/lib/ro-calendar";

export type GuestCompletedStaySummary = {
  id: string;
  check_in: string;
  check_out: string;
  room_names: string[];
};

type Props = {
  stays: GuestCompletedStaySummary[];
  historyHref: string;
  maxItems?: number;
};

export function GuestCompletedStaysPanel({
  stays,
  historyHref,
  maxItems = 4,
}: Props) {
  const tGuests = useTranslations("admin.guests");
  const locale = useLocale();
  const visible = stays.slice(0, maxItems);
  const hiddenCount = Math.max(0, stays.length - visible.length);

  return (
    <section className="guest-hero__stays">
      <div className="guest-hero__stays-head">
        <p className="guest-hero__stays-title">{tGuests("staysPanel.title")}</p>
        <span className="guest-hero__stays-count">
          {tGuests("staysCount", { count: stays.length })}
        </span>
      </div>

      {stays.length === 0 ? (
        <p className="guest-hero__stays-empty">{tGuests("staysPanel.empty")}</p>
      ) : (
        <>
          <ul className="guest-hero__stays-list">
            {visible.map((stay) => (
              <li key={stay.id} className="guest-hero__stays-item">
                <Link
                  href={`/admin/bookings/${stay.id}`}
                  className="guest-hero__stays-link"
                >
                  <span className="guest-hero__stays-period">
                    {formatStayPeriod(stay.check_in, stay.check_out, locale, true)}
                  </span>
                  {stay.room_names.length > 0 ? (
                    <span className="guest-hero__stays-rooms">
                      {stay.room_names.join(", ")}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
          {hiddenCount > 0 ? (
            <p className="guest-hero__stays-more">
              {tGuests("staysPanel.more", { count: hiddenCount })}
            </p>
          ) : null}
        </>
      )}

      <Link href={historyHref} className="guest-hero__stays-history-link">
        {tGuests("staysPanel.openHistory")} →
      </Link>
    </section>
  );
}
