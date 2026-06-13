type Item = {
  id: string;
  url: string;
  caption?: string;
};

export function GuestGalleryGrid({ items }: { items: Item[] }) {
  return (
    <div className="guest-app__gallery-grid">
      {items.map((item) => (
        <figure key={item.id} className="guest-app__gallery-item">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt={item.caption ?? ""} loading="lazy" />
          {item.caption ? (
            <figcaption className="guest-app__gallery-item__caption">{item.caption}</figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}
