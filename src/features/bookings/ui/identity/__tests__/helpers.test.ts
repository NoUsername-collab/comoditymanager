import { describe, expect, it } from "vitest";
import {
  allIdentityEmpty,
  areIdentityChecksReady,
  hasLookupIdentity,
  identityFingerprint,
  isBookingIdentitySubmitReady,
} from "@/features/bookings/ui/identity/helpers";

describe("guest identity autofill helpers", () => {
  it("detects when lookup should run", () => {
    expect(
      hasLookupIdentity({
        lastName: "",
        firstName: "",
        email: "",
        phone: "0712345678",
      }),
    ).toBe(true);
    expect(
      hasLookupIdentity({
        lastName: "Pop",
        firstName: "Ana",
        email: "",
        phone: "",
      }),
    ).toBe(true);
    expect(
      hasLookupIdentity({
        lastName: "P",
        firstName: "A",
        email: "",
        phone: "",
      }),
    ).toBe(false);
  });

  it("detects when all identity fields are empty", () => {
    expect(
      allIdentityEmpty({
        lastName: "",
        firstName: "",
        email: "",
        phone: "",
      }),
    ).toBe(true);
    expect(
      allIdentityEmpty({
        lastName: " ",
        firstName: "",
        email: "",
        phone: "",
      }),
    ).toBe(true);
  });
});

describe("identity check gate", () => {
  const phoneOnly = {
    lastName: "",
    firstName: "",
    email: "",
    phone: "0712345678",
  };

  it("fingerprints identity without case or padding", () => {
    expect(
      identityFingerprint({
        lastName: " Pop ",
        firstName: "ANA",
        email: "  a@b.ro ",
        phone: "0712",
      }),
    ).toBe(
      identityFingerprint({
        lastName: "pop",
        firstName: "ana",
        email: "a@b.ro",
        phone: "0712",
      }),
    );
  });

  it("is ready when there is nothing to look up", () => {
    expect(
      areIdentityChecksReady({
        values: {
          lastName: "P",
          firstName: "A",
          email: "",
          phone: "",
        },
        pending: false,
        settledFingerprint: null,
      }),
    ).toBe(true);
  });

  it("blocks create until lookup finishes for the current values", () => {
    expect(
      areIdentityChecksReady({
        values: phoneOnly,
        pending: false,
        settledFingerprint: null,
      }),
    ).toBe(false);
    expect(
      areIdentityChecksReady({
        values: phoneOnly,
        pending: true,
        settledFingerprint: identityFingerprint(phoneOnly),
      }),
    ).toBe(false);
    expect(
      areIdentityChecksReady({
        values: phoneOnly,
        pending: false,
        settledFingerprint: identityFingerprint(phoneOnly),
      }),
    ).toBe(true);
  });

  it("blocks create again after identity changes", () => {
    expect(
      areIdentityChecksReady({
        values: { ...phoneOnly, phone: "0722000000" },
        pending: false,
        settledFingerprint: identityFingerprint(phoneOnly),
      }),
    ).toBe(false);
  });
});

describe("booking identity submit gate", () => {
  const ready = {
    lastName: "Pop",
    firstName: "Ana",
    phone: "0712345678",
    email: "",
    identityChecksReady: true,
  };

  it("requires name, phone, and finished checks", () => {
    expect(isBookingIdentitySubmitReady(ready)).toBe(true);
    expect(
      isBookingIdentitySubmitReady({ ...ready, identityChecksReady: false }),
    ).toBe(false);
    expect(isBookingIdentitySubmitReady({ ...ready, lastName: "" })).toBe(false);
    expect(isBookingIdentitySubmitReady({ ...ready, phone: "" })).toBe(false);
  });

  it("requires email only when asked", () => {
    expect(isBookingIdentitySubmitReady({ ...ready, emailRequired: true })).toBe(
      false,
    );
    expect(
      isBookingIdentitySubmitReady({
        ...ready,
        email: "ana@host.ro",
        emailRequired: true,
      }),
    ).toBe(true);
  });
});