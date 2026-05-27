import { Link } from "@/i18n/navigation";
import { btnPrimary } from "@/lib/admin-ui";

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        )}
      </div>
      {action && (
        <Link href={action.href} className={btnPrimary}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
