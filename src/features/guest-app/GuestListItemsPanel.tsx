import type { GuestAppListItem } from "@/domain/guest-app/types";

export function GuestListItemsPanel({ items }: { items: GuestAppListItem[] }) {
  return (
    <ul className="guest-app__list-items">
      {items.map((item) => (
        <li key={`${item.title}-${item.description ?? ""}`} className="guest-app__list-item">
          {item.icon ? (
            <span className="guest-app__list-item__icon" aria-hidden>
              {item.icon}
            </span>
          ) : null}
          <div>
            <p className="guest-app__list-item__title">{item.title}</p>
            {item.description ? (
              <p className="guest-app__list-item__desc">{item.description}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
