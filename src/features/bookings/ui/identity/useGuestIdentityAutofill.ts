"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { suggestExistingGuestAction } from "@/features/guests/actions";
import {
  IDENTITY_LOOKUP_DEBOUNCE_MS,
  allIdentityEmpty,
  areIdentityChecksReady,
  hasLookupIdentity,
  identityFingerprint,
  type GuestIdentityValues,
} from "@/features/bookings/ui/identity/helpers";

type GuestField = keyof GuestIdentityValues;

export type GuestIdentityHintLabels = {
  onFound: (displayName: string) => string;
  onWatchlist: (displayName: string) => string;
  onBlacklist: (displayName: string) => string;
};

type GuestAutofillMatch = {
  lastName: string;
  firstName: string;
  email: string | null;
  phone: string | null;
  displayName: string;
  flagLevel: "normal" | "watchlist" | "blacklist" | null;
};

function emptyUserOwned(): Record<GuestField, boolean> {
  return {
    lastName: false,
    firstName: false,
    email: false,
    phone: false,
  };
}

function mergeAutofillValues(
  values: GuestIdentityValues,
  match: GuestAutofillMatch,
  owned: Record<GuestField, boolean>,
): GuestIdentityValues {
  return {
    lastName: owned.lastName ? values.lastName : match.lastName,
    firstName: owned.firstName ? values.firstName : match.firstName,
    email: owned.email ? values.email : (match.email ?? values.email),
    phone: owned.phone ? values.phone : (match.phone ?? values.phone),
  };
}

export function useGuestIdentityAutofill(
  hints: GuestIdentityHintLabels,
  options?: { lookup?: boolean },
) {
  const lookupEnabled = options?.lookup !== false;
  const [guestLastName, setGuestLastName] = useState("");
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [identityHint, setIdentityHint] = useState<string | null>(null);
  const [identityHintTone, setIdentityHintTone] = useState<"neutral" | "warn">(
    "neutral",
  );
  const [settledFingerprint, setSettledFingerprint] = useState<string | null>(
    null,
  );
  const [identityPending, startIdentityTransition] = useTransition();
  const userOwnedRef = useRef<Record<GuestField, boolean>>(emptyUserOwned());
  const hintsRef = useRef(hints);
  const requestIdRef = useRef(0);
  const settledFingerprintRef = useRef<string | null>(null);
  const lookupEnabledRef = useRef(lookupEnabled);

  hintsRef.current = hints;
  settledFingerprintRef.current = settledFingerprint;
  lookupEnabledRef.current = lookupEnabled;

  const currentValues = useCallback(
    (): GuestIdentityValues => ({
      lastName: guestLastName,
      firstName: guestFirstName,
      email: guestEmail,
      phone: guestPhone,
    }),
    [guestLastName, guestFirstName, guestEmail, guestPhone],
  );

  const resetGuestIdentity = useCallback(() => {
    setGuestLastName("");
    setGuestFirstName("");
    setGuestEmail("");
    setGuestPhone("");
    setIdentityHint(null);
    setIdentityHintTone("neutral");
    setSettledFingerprint(null);
    settledFingerprintRef.current = null;
    userOwnedRef.current = emptyUserOwned();
    requestIdRef.current += 1;
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

  const settleFingerprint = useCallback((fingerprint: string) => {
    settledFingerprintRef.current = fingerprint;
    setSettledFingerprint(fingerprint);
  }, []);

  const applyLookupResult = useCallback(
    (values: GuestIdentityValues, match: GuestAutofillMatch | null) => {
      if (!match) {
        settleFingerprint(identityFingerprint(values));
        return;
      }

      const next = mergeAutofillValues(values, match, userOwnedRef.current);
      if (!userOwnedRef.current.lastName) setGuestLastName(next.lastName);
      if (!userOwnedRef.current.firstName) setGuestFirstName(next.firstName);
      if (!userOwnedRef.current.email) setGuestEmail(next.email);
      if (!userOwnedRef.current.phone) setGuestPhone(next.phone);

      const labels = hintsRef.current;
      if (match.flagLevel === "blacklist") {
        setIdentityHintTone("warn");
        setIdentityHint(labels.onBlacklist(match.displayName));
      } else if (match.flagLevel === "watchlist") {
        setIdentityHintTone("warn");
        setIdentityHint(labels.onWatchlist(match.displayName));
      } else {
        setIdentityHintTone("neutral");
        setIdentityHint(labels.onFound(match.displayName));
      }

      settleFingerprint(identityFingerprint(next));
    },
    [settleFingerprint],
  );

  const runLookup = useCallback(
    (values: GuestIdentityValues) => {
      if (!lookupEnabledRef.current) return;
      if (allIdentityEmpty(values)) {
        userOwnedRef.current = emptyUserOwned();
        setIdentityHint(null);
        setIdentityHintTone("neutral");
        settleFingerprint(identityFingerprint(values));
        return;
      }
      if (!hasLookupIdentity(values)) return;

      const fingerprint = identityFingerprint(values);
      if (fingerprint === settledFingerprintRef.current) return;

      const requestId = ++requestIdRef.current;
      startIdentityTransition(async () => {
        const res = await suggestExistingGuestAction({
          guest_last_name: values.lastName,
          guest_first_name: values.firstName,
          guest_email: values.email,
          guest_phone: values.phone,
        });
        if (requestId !== requestIdRef.current) return;
        if (!res.ok) {
          settleFingerprint(fingerprint);
          return;
        }
        applyLookupResult(values, res.match);
      });
    },
    [applyLookupResult, settleFingerprint],
  );

  useEffect(() => {
    if (!lookupEnabled) return;
    const values = currentValues();
    if (!hasLookupIdentity(values)) return;
    if (identityFingerprint(values) === settledFingerprintRef.current) return;

    const timeoutId = window.setTimeout(() => {
      runLookup(values);
    }, IDENTITY_LOOKUP_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [currentValues, lookupEnabled, runLookup]);

  const maybeAutofillGuest = useCallback(() => {
    runLookup(currentValues());
  }, [currentValues, runLookup]);

  const identityChecksReady =
    !lookupEnabled ||
    areIdentityChecksReady({
      values: currentValues(),
      pending: identityPending,
      settledFingerprint,
    });

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
    identityChecksReady,
    resetGuestIdentity,
  };
}