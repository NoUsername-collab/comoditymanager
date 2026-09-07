import {
  buildBookingNoticeView,
  type BookingNoticePresetCopy,
} from "@/features/public-site/domain/booking-notice";
import type { PublicBookingNoticeConfig } from "@/features/public-site/domain/types";

export function PublicBookingNotice({
  notice,
  locale,
  checkInTime,
  checkOutTime,
  fallbackTitle,
  fallbackFooter,
  presets,
}: {
  notice: PublicBookingNoticeConfig | null | undefined;
  locale: string;
  checkInTime: string;
  checkOutTime: string;
  fallbackTitle: string;
  fallbackFooter: string;
  presets: BookingNoticePresetCopy;
}) {
  const view = buildBookingNoticeView({
    notice,
    locale,
    checkInTime,
    checkOutTime,
    fallbackTitle,
    fallbackFooter,
    presets,
  });

  if (!view.enabled || view.items.length === 0) return null;

  return (
    <aside className="pub-booking-aside">
      {view.title ? (
        <p className="text-sm font-semibold text-[var(--site-fg)]">{view.title}</p>
      ) : null}
      <ul className="pub-booking-aside__list">
        {view.items.map((item) => (
          <li key={item.id} className="pub-booking-aside__item">
            <span aria-hidden>{item.icon}</span>
            <span>
              {item.title ? <strong>{item.title}</strong> : null}
              {item.text ? <span>{item.text}</span> : null}
            </span>
          </li>
        ))}
      </ul>
      {view.footer ? (
        <p className="pub-booking-surplus-note">{view.footer}</p>
      ) : null}
    </aside>
  );
}
