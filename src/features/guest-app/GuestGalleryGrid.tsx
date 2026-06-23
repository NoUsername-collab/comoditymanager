import Image from "next/image";

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
          <Image
            src={item.url}
            alt={item.caption ?? ""}
            width={640}
            height={480}
            sizes="(max-width: 768px) 100vw, 33vw"
            className="guest-app__gallery-item__img"
            loading="lazy"
          />
          {item.caption ? (
            <figcaption className="guest-app__gallery-item__caption">{item.caption}</figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}
