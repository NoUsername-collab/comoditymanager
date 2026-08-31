"use client";

import { memo } from "react";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { formatBookingRef } from "@/lib/booking-admin-links";
import { formatCazariLabel } from "@/lib/cazari-label-format";
import { RefusedStayActions } from "@/features/cazari/ui/RefusedStayActions";
import { StayActions } from "@/features/cazari/ui/StayActions";
import { StayRequestActions } from "@/features/cazari/ui/StayRequestActions";
import { StayInfo } from "@/features/cazari/ui/StayInfo";
import type {
  CancelledStay,
  CazariLabels,
  OperationalStay,
  StayCardRow,
} from "@/features/cazari/ui/types";

type Props = {
  stay: StayCardRow;
  rowClass: string;
  variant: "cereri" | "confirmate" | "refuzate";
  returnTo: string;
  labels: CazariLabels;
  operativeToday?: string;
};

export const StayListItem = memo(function StayListItem({
  stay,
  rowClass,
  variant,
  returnTo,
  labels,
  operativeToday,
}: Props) {
  return (
    <li className={rowClass}>
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
            cancelMessage: formatCazariLabel(labels.cancelRequestMsg, {
              ref: formatBookingRef(stay.id),
              name: stay.guest_name,
              period: formatStayPeriod(stay.check_in, stay.check_out, true),
            }),
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
  );
});
