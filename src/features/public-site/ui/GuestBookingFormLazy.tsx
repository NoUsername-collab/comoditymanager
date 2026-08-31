"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { GuestBookingForm } from "@/components/calendar/GuestBookingForm";

const GuestBookingFormDynamic = dynamic(
  () =>
    import("@/components/calendar/GuestBookingForm").then((m) => ({
      default: m.GuestBookingForm,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="public-booking-form-skeleton min-h-[20rem] animate-pulse rounded-xl border border-[var(--site-border)] bg-[var(--site-card)]"
        aria-busy="true"
        aria-label="Loading booking form"
      />
    ),
  }
);

export function GuestBookingFormLazy(
  props: ComponentProps<typeof GuestBookingForm>
) {
  return <GuestBookingFormDynamic {...props} />;
}
