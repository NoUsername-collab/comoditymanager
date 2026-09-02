"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { isBookingIdentitySubmitReady } from "@/features/bookings/ui/identity/helpers";
import { useGuestIdentityAutofill } from "@/features/bookings/ui/identity/useGuestIdentityAutofill";

export type BookingIdentityOptions = {
  /** Staff surfaces look up existing guests. Public booking must not. */
  lookup?: boolean;
  emailRequired?: boolean;
};

export function useBookingIdentity(options?: BookingIdentityOptions) {
  const t = useTranslations("bookingIdentity");
  const lookup = options?.lookup ?? true;
  const emailRequired = options?.emailRequired ?? false;
  const hints = useMemo(
    () => ({
      onFound: (name: string) => t("existingGuestFound", { name }),
      onWatchlist: (name: string) => t("existingGuestWatchlist", { name }),
      onBlacklist: (name: string) => t("existingGuestBlacklist", { name }),
    }),
    [t],
  );
  const identity = useGuestIdentityAutofill(hints, { lookup });

  return {
    ...identity,
    emailRequired,
    canSubmit: isBookingIdentitySubmitReady({
      lastName: identity.guestLastName,
      firstName: identity.guestFirstName,
      phone: identity.guestPhone,
      email: identity.guestEmail,
      identityChecksReady: identity.identityChecksReady,
      emailRequired,
    }),
    checkingLabel: t("checkingExistingGuest"),
  };
}

export type BookingIdentityController = ReturnType<typeof useBookingIdentity>;