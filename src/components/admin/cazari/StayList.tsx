import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminPanel } from "@/components/admin/shell/AdminPanel";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { formatBookingRef } from "@/lib/booking-admin-links";
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
  operativeToday,
  className,
}: {
  title: string;
  subtitle?: string;
  items: StayCardRow[];
  variant: "cereri" | "confirmate" | "refuzate";
  returnTo: string;
  hasQuery: boolean;
  labels: CazariLabels;
  operativeToday?: string;
  className?: string;
}) {
  const emptyState =
    variant === "confirmate"
      ? {
          emoji: "🛏",
          ...(hasQuery
            ? {
                title: labels.emptyConfirmedFilter.title,
                description: labels.emptyConfirmedFilter.description,
                href: labels.emptyConfirmedFilter.href,
                label: labels.emptyConfirmedFilter.label,
              }
            : labels.emptyConfirmed),
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
            ...(hasQuery
              ? {
                  title: labels.emptyRequestFilter.title,
                  description: labels.emptyRequestFilter.description,
                  href: labels.emptyRequestFilter.href,
                  label: labels.emptyRequestFilter.label,
                }
              : labels.emptyRequest),
          };

  const rowClass =
    variant === "refuzate"
      ? "stay-card stay-card--red grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto]"
      : variant === "cereri"
        ? "stay-card stay-card--yellow grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto]"
        : "stay-card stay-card--green grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto]";

  return (
    <AdminPanel
      title={title}
      className={["mb-3", className].filter(Boolean).join(" ")}
    >
      {subtitle ? (
        <p className="mb-2 text-[11px] text-zinc-500">{subtitle}</p>
      ) : null}
      {variant === "refuzate" ? (
        <p className="admin-banner admin-banner--danger admin-banner--compact mb-2">
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
        <ul className="stay-list space-y-2">
          {items.map((stay) => (
            <li key={stay.id} className={rowClass}>
              <StayInfo
                stay={stay}
                labels={labels}
                variant={variant === "refuzate" ? "refuzate" : "operational"}
                operativeToday={operativeToday}
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
                  labels={{
                    quickAccept: labels.quickAccept,
                    quickAcceptSuccess: labels.quickAcceptSuccess,
                    openBooking: labels.openBooking,
                    cancelRequest: labels.cancelRequest,
                    cancelMessage: labels.cancelRequestMsg(
                      formatBookingRef(stay.id),
                      stay.guest_name,
                      formatStayPeriod(stay.check_in, stay.check_out, true),
                    ),
                  }}
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
    </AdminPanel>
  );
}
