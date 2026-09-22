"use client";

import { memo } from "react";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { formatBookingRef } from "@/lib/booking-admin-links";
import { formatStayLabel } from "@/lib/stay-label-format";
import { RefusedStayActions } from "@/features/stays/ui/RefusedStayActions";
import { StayActions } from "@/features/stays/ui/StayActions";
import { StayRequestActions } from "@/features/stays/ui/StayRequestActions";
import { StayInfo } from "@/features/stays/ui/StayInfo";
import type {
  CancelledStay,
  StayListLabels,
  OperationalStay,
  StayCardRow,
  StayListVariant,
} from "@/features/stays/ui/types";

type Props = {
  stay: StayCardRow;
  rowClass: string;
  variant: StayListVariant;
  returnTo: string;
  labels: StayListLabels;
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
        variant={variant === "cancelled" ? "cancelled" : "operational"}
        operativeToday={operativeToday}
      />
      {variant === "cancelled" ? (
        <RefusedStayActions
          stay={stay as CancelledStay}
          labels={labels}
          returnTo={returnTo}
        />
      ) : variant === "requests" ? (
        <StayRequestActions
          stay={stay as OperationalStay}
          returnTo={returnTo}
          labels={{
            quickAccept: labels.quickAccept,
            quickAcceptSuccess: labels.quickAcceptSuccess,
            openBooking: labels.openBooking,
            cancelRequest: labels.cancelRequest,
            cancelMessage: formatStayLabel(labels.cancelRequestMsg, {
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
