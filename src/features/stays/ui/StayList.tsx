"use client";

import { useEffect, useState, type ReactNode } from "react";
import { STAY_LIST_VIRTUAL_MIN_ITEMS } from "@/domain/stays/confirmed-buckets";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminPanel } from "@/components/admin/shell/AdminPanel";
import { StayListItem } from "@/features/stays/ui/StayListItem";
import { StayListVirtualized } from "@/features/stays/ui/StayListVirtualized";
import { useLiveStays } from "@/lib/stays/live-stays";
import type {
  StayListLabels,
  StayCardRow,
  StayListVariant,
} from "@/features/stays/ui/types";

function StayListCollapsible({
  title,
  subtitle,
  defaultExpanded,
  hasQuery,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultExpanded: boolean;
  hasQuery: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setExpanded(hasQuery ? true : defaultExpanded);
  }, [hasQuery, defaultExpanded]);

  return (
    <AdminPanel
      title={title}
      className={[
        "mb-3 stays-bucket-panel",
        !expanded && "stays-bucket-panel--collapsed",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="stays-bucket-panel__toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <span className="stays-bucket-panel__toggle-text">
          <span className="stays-bucket-panel__title">{title}</span>
          {subtitle ? (
            <span className="stays-bucket-panel__subtitle">{subtitle}</span>
          ) : null}
        </span>
        <span className="stays-bucket-panel__chevron" aria-hidden>
          {expanded ? "\u25BE" : "\u25B8"}
        </span>
      </button>
      {expanded ? children : null}
    </AdminPanel>
  );
}

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
  collapsible = false,
  defaultExpanded = true,
}: {
  title: string;
  subtitle?: string;
  items: StayCardRow[];
  variant: StayListVariant;
  returnTo: string;
  hasQuery: boolean;
  labels: StayListLabels;
  operativeToday?: string;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}) {
  const liveItems = useLiveStays(items);

  const emptyState =
    variant === "confirmed"
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
      : variant === "cancelled"
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
    variant === "cancelled"
      ? "stay-card stay-card--red stay-card--stacked"
      : variant === "requests"
        ? "stay-card stay-card--yellow stay-card--stacked"
        : "stay-card stay-card--green stay-card--stacked";

  const listBody =
    liveItems.length === 0 ? (
      <AdminEmptyState
        emoji={emptyState.emoji}
        title={emptyState.title}
        description={emptyState.description}
        actionHref={"href" in emptyState ? emptyState.href : undefined}
        actionLabel={"label" in emptyState ? emptyState.label : undefined}
      />
    ) : liveItems.length >= STAY_LIST_VIRTUAL_MIN_ITEMS ? (
      <StayListVirtualized
        items={liveItems}
        rowClass={rowClass}
        variant={variant}
        returnTo={returnTo}
        labels={labels}
        operativeToday={operativeToday}
      />
    ) : (
      <ul className="stay-list space-y-2">
        {liveItems.map((stay) => (
          <StayListItem
            key={stay.id}
            stay={stay}
            rowClass={rowClass}
            variant={variant}
            returnTo={returnTo}
            labels={labels}
            operativeToday={operativeToday}
          />
        ))}
      </ul>
    );

  const panelContent = (
    <>
      {!collapsible && subtitle ? (
        <p className="mb-2 text-[11px] text-zinc-500">{subtitle}</p>
      ) : null}
      {variant === "cancelled" ? (
        <p className="admin-banner admin-banner--danger admin-banner--compact mb-2">
          {labels.refusedHint}
        </p>
      ) : null}
      {listBody}
    </>
  );

  if (collapsible) {
    return (
      <StayListCollapsible
        title={title}
        subtitle={subtitle}
        defaultExpanded={defaultExpanded}
        hasQuery={hasQuery}
        className={className}
      >
        {panelContent}
      </StayListCollapsible>
    );
  }

  return (
    <AdminPanel
      title={title}
      className={["mb-3", className].filter(Boolean).join(" ")}
    >
      {panelContent}
    </AdminPanel>
  );
}
