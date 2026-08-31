"use client";

import { useCallback, useRef } from "react";
import {
  STAY_CARD_VIRTUAL_ROW_H,
} from "@/domain/cazari/confirmed-buckets";
import { useWindowVirtualRange } from "@/hooks/useWindowVirtualRange";
import { StayListItem } from "@/features/cazari/ui/StayListItem";
import type {
  CazariLabels,
  StayCardRow,
} from "@/features/cazari/ui/types";

function StayListSpacer({ height }: { height: number }) {
  if (height <= 0) return null;
  return (
    <li
      className="stay-list__virtual-spacer"
      aria-hidden
      style={{ height, padding: 0, border: "none", margin: 0 }}
    />
  );
}

export function StayListVirtualized({
  items,
  rowClass,
  variant,
  returnTo,
  labels,
  operativeToday,
}: {
  items: StayCardRow[];
  rowClass: string;
  variant: "cereri" | "confirmate" | "refuzate";
  returnTo: string;
  labels: CazariLabels;
  operativeToday?: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);

  const estimateSize = useCallback(() => STAY_CARD_VIRTUAL_ROW_H, []);

  const { range, paddingTop, paddingBottom } = useWindowVirtualRange({
    count: items.length,
    estimateSize,
    shellRef: listRef,
    theadRef: { current: null },
    overscan: 4,
    enabled: true,
  });

  const visibleItems = items.slice(range.start, range.end);

  return (
    <ul ref={listRef} className="stay-list stay-list--virtual space-y-2">
      <StayListSpacer height={paddingTop} />
      {visibleItems.map((stay, index) => (
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
      <StayListSpacer height={paddingBottom} />
    </ul>
  );
}
