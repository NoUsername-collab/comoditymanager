"use client";

import dynamic from "next/dynamic";
import type { GuestAccessBookingSnapshot } from "@/domain/guest-app/types";
import type { GuestPrecheckinPrefill } from "@/domain/guest-app/precheckin-prefill";

const GuestOnlineCheckinForm = dynamic(
  () =>
    import("./GuestOnlineCheckinForm").then((m) => ({
      default: m.GuestOnlineCheckinForm,
    })),
  {
    loading: () => (
      <div className="guest-app__skeleton-row" aria-busy="true" aria-label="…" />
    ),
  },
);

type Props = {
  accessCode: string;
  booking: GuestAccessBookingSnapshot;
  prefill: GuestPrecheckinPrefill;
  alreadySubmitted: boolean;
};

export function GuestOnlineCheckinSection(props: Props) {
  return <GuestOnlineCheckinForm {...props} />;
}
