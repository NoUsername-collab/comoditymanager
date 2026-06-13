import { describe, expect, it } from "vitest";
import {
  allIdentityEmpty,
  hasLookupIdentity,
} from "@/hooks/useGuestIdentityAutofill.helpers";

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
