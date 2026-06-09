import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import { RefusedStayActions } from "@/components/admin/cazari/RefusedStayActions";
import { StayActions } from "@/components/admin/cazari/StayActions";
import { StayRequestActions } from "@/components/admin/cazari/StayRequestActions";
import { StayInfo } from "@/components/admin/cazari/StayInfo";
import type {
  CancelledStay,
  CazariLabels,
  OperationalStay,
  StayCardRow,
} from "@/components/admin/cazari/types";

export function StayList({
  title,
  subtitle,
  items,
  variant,
  returnTo,
  hasQuery,
  labels,
}: {
  title: string;
  subtitle?: string;
  items: StayCardRow[];
  variant: "cereri" | "confirmate" | "refuzate";
  returnTo: string;
  hasQuery: boolean;
  labels: CazariLabels;
}) {
  const emptyState =
    variant === "confirmate"
      ? {
          emoji: "🛏",
          ...labels.emptyConfirmed,
        }
      : variant === "refuzate"
        ? {
            emoji: "⛔",
            title: hasQuery ? labels.refusedEmptyFilter : labels.refusedEmpty,
            description: hasQuery
              ? labels.refusedEmptyFilterDesc
              : labels.refusedEmptyDesc,
            href: "/admin/bookings",
            label: labels.refusedBrowseBookings,
          }
        : {
            emoji: "📬",
            ...labels.emptyRequest,
          };

  const rowClass =
    variant === "refuzate"
      ? "stay-card stay-card--red grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto]"
      : variant === "cereri"
        ? "stay-card stay-card--yellow grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto]"
        : "stay-card stay-card--green grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto]";

  return (
    <RetroXpWindow title={title} className="mb-3">
      {subtitle ? (
        <p className="mb-2 text-[11px] text-zinc-500">{subtitle}</p>
      ) : null}
      {variant === "refuzate" ? (
        <p className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-900">
          {labels.refusedHint}
        </p>
      ) : null}
      {items.length === 0 ? (
        <AdminEmptyState
          emoji={emptyState.emoji}
          title={emptyState.title}
          description={emptyState.description}
          actionHref={"href" in emptyState ? emptyState.href : undefined}
          actionLabel={"label" in emptyState ? emptyState.label : undefined}
        />
      ) : (
        <ul className="space-y-2">
          {items.map((stay) => (
            <li key={stay.id} className={rowClass}>
              <StayInfo
                stay={stay}
                labels={labels}
                variant={variant === "refuzate" ? "refuzate" : "operational"}
              />
              {variant === "refuzate" ? (
                <RefusedStayActions
                  stay={stay as CancelledStay}
                  labels={labels}
                  returnTo={returnTo}
                />
              ) : variant === "cereri" ? (
                <StayRequestActions
                  stay={stay as OperationalStay}
                  returnTo={returnTo}
                  labels={labels}
                />
              ) : (
                <StayActions
                  stay={stay as OperationalStay}
                  returnTo={returnTo}
                  labels={labels}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </RetroXpWindow>
  );
}
