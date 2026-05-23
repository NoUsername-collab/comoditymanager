import Link from "next/link";

export function AdminEmptyState({
  emoji,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  emoji: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="admin-empty-state">
      <span className="admin-empty-state__emoji" aria-hidden>
        {emoji}
      </span>
      <p className="admin-empty-state__title">{title}</p>
      <p className="admin-empty-state__desc">{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="admin-empty-state__action">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
