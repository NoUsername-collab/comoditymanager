import type { GuestListItem } from "@/domain/guest/types";
import { GuestListCard } from "@/components/admin/guests/GuestListCard";
import {
  guestListPreviewHref,
  guestProfileHref,
} from "@/lib/guest-list-links";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  guests: GuestListItem[];
  currentHref: string;
  guestsCountLabel: string;
  emptyLabel: string;
};

export function GuestRecentHeroSection({
  eyebrow,
  title,
  description,
  guests,
  currentHref,
  guestsCountLabel,
  emptyLabel,
}: Props) {
  return (
    <section className="guest-section guest-surface guest-section--hero">
      <div className="guest-section__header guest-section__header--hero">
        <div>
          <p className="guest-section__eyebrow">{eyebrow}</p>
          <h2 className="guest-section__title guest-section__title--hero">{title}</h2>
          <p className="guest-section__desc">{description}</p>
        </div>
        <span className="guest-section__count guest-section__count--hero" aria-live="polite">
          {guestsCountLabel}
        </span>
      </div>
      {guests.length === 0 ? (
        <p className="guest-section__empty">{emptyLabel}</p>
      ) : (
        <ul className="guest-grid guest-grid--hero">
          {guests.map((guest) => (
            <GuestListCard
              key={guest.id}
              guest={guest}
              previewHref={guestListPreviewHref(currentHref, guest.id)}
              profileHref={guestProfileHref(currentHref, guest.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
