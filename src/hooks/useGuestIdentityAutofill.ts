"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { suggestExistingGuestAction } from "@/features/public-site/calendar-actions";
import {
  allIdentityEmpty,
  hasLookupIdentity,
  type GuestIdentityValues,
} from "@/hooks/useGuestIdentityAutofill.helpers";

type GuestField = keyof GuestIdentityValues;

type GuestIdentityHintLabels = {
  onFound: (displayName: string) => string;
  onWatchlist: (displayName: string) => string;
  onBlacklist: (displayName: string) => string;
};

function emptyUserOwned(): Record<GuestField, boolean> {
  return {
    lastName: false,
    firstName: false,
    email: false,
    phone: false,
  };
}

export function useGuestIdentityAutofill(hints: GuestIdentityHintLabels) {
  const [guestLastName, setGuestLastName] = useState("");
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [identityHint, setIdentityHint] = useState<string | null>(null);
  const [identityHintTone, setIdentityHintTone] = useState<"neutral" | "warn">(
    "neutral",
  );
  const [identityPending, startIdentityTransition] = useTransition();
  const userOwnedRef = useRef<Record<GuestField, boolean>>(emptyUserOwned());

  const currentValues = (): GuestIdentityValues => ({
    lastName: guestLastName,
    firstName: guestFirstName,
    email: guestEmail,
    phone: guestPhone,
  });

  const resetGuestIdentity = useCallback(() => {
    setGuestLastName("");
    setGuestFirstName("");
    setGuestEmail("");
    setGuestPhone("");
    setIdentityHint(null);
    setIdentityHintTone("neutral");
    userOwnedRef.current = emptyUserOwned();
  }, []);

  const markFieldEdited = useCallback((field: GuestField) => {
    userOwnedRef.current[field] = true;
    setIdentityHint(null);
  }, []);

  const onLastNameChange = useCallback(
    (value: string) => {
      setGuestLastName(value);
      markFieldEdited("lastName");
    },
    [markFieldEdited],
  );

  const onFirstNameChange = useCallback(
    (value: string) => {
      setGuestFirstName(value);
      markFieldEdited("firstName");
    },
    [markFieldEdited],
  );

  const onEmailChange = useCallback(
    (value: string) => {
      setGuestEmail(value);
      markFieldEdited("email");
    },
    [markFieldEdited],
  );

  const onPhoneChange = useCallback(
    (value: string) => {
      setGuestPhone(value);
      markFieldEdited("phone");
    },
    [markFieldEdited],
  );

  const maybeAutofillGuest = useCallback(() => {
    const values = currentValues();
    if (allIdentityEmpty(values)) {
      userOwnedRef.current = emptyUserOwned();
      setIdentityHint(null);
      return;
    }
    if (!hasLookupIdentity(values)) return;

    startIdentityTransition(async () => {
      const res = await suggestExistingGuestAction({
        guest_last_name: values.lastName,
        guest_first_name: values.firstName,
        guest_email: values.email,
        guest_phone: values.phone,
      });
      if (!res.ok || !res.match) return;

      const owned = userOwnedRef.current;
      if (!owned.lastName) setGuestLastName(res.match.lastName);
      if (!owned.firstName) setGuestFirstName(res.match.firstName);
      if (!owned.email) {
        setGuestEmail(res.match.email ?? values.email);
      }
      if (!owned.phone) {
        setGuestPhone(res.match.phone ?? values.phone);
      }

      if (res.match.flagLevel === "blacklist") {
        setIdentityHintTone("warn");
        setIdentityHint(hints.onBlacklist(res.match.displayName));
      } else if (res.match.flagLevel === "watchlist") {
        setIdentityHintTone("warn");
        setIdentityHint(hints.onWatchlist(res.match.displayName));
      } else {
        setIdentityHintTone("neutral");
        setIdentityHint(hints.onFound(res.match.displayName));
      }
    });
  }, [
    guestLastName,
    guestFirstName,
    guestEmail,
    guestPhone,
    hints,
  ]);

  return {
    guestLastName,
    guestFirstName,
    guestEmail,
    guestPhone,
    onLastNameChange,
    onFirstNameChange,
    onEmailChange,
    onPhoneChange,
    maybeAutofillGuest,
    identityHint,
    identityHintTone,
    identityPending,
    resetGuestIdentity,
  };
}
