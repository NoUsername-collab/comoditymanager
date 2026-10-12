"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { GuestAccessBookingSnapshot } from "@/domain/guest-app/types";
import type { GuestPrecheckinPrefill } from "@/domain/guest-app/precheckin-prefill";

function CheckinFormFallback() {
  const t = useTranslations("guestApp.shell");
  return <div className="guest-app__skeleton-row" aria-busy="true" aria-label={t("loading")} />;
}

const GuestOnlineCheckinForm = dynamic(
  () =>
    import("./GuestOnlineCheckinForm").then((m) => ({
      default: m.GuestOnlineCheckinForm,
    })),
  {
    loading: () => <CheckinFormFallback />,
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
