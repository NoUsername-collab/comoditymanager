import { describe, expect, it } from "vitest";
import {
  assertBookingConfirmable,
  assertBookingRoomAssignable,
  isBookingConfirmable,
  isBookingRoomAssignable,
} from "@/domain/booking/lifecycle-guards";

describe("isBookingRoomAssignable", () => {
  it("allows cerere_noua only", () => {
    expect(isBookingRoomAssignable("cerere_noua")).toBe(true);
    expect(isBookingRoomAssignable("confirmata")).toBe(false);
    expect(isBookingRoomAssignable("anulata")).toBe(false);
  });
});

describe("isBookingConfirmable", () => {
  it("allows cerere_noua and re-accepted anulata", () => {
    expect(isBookingConfirmable("cerere_noua")).toBe(true);
    expect(isBookingConfirmable("anulata")).toBe(true);
    expect(isBookingConfirmable("confirmata")).toBe(false);
  });
});

describe("assertBookingRoomAssignable", () => {
  it("throws when missing", () => {
    expect(() => assertBookingRoomAssignable(null)).toThrow(
      "booking.request_not_found",
    );
  });

  it("throws when cancelled or confirmed", () => {
    expect(() =>
      assertBookingRoomAssignable({ status: "anulata" }),
    ).toThrow("booking.request_cancelled");
    expect(() =>
      assertBookingRoomAssignable({ status: "confirmata" }),
    ).toThrow("booking.already_confirmed");
  });
});

describe("assertBookingConfirmable", () => {
  it("throws when already confirmed", () => {
    expect(() =>
      assertBookingConfirmable({ status: "confirmata" }),
    ).toThrow("booking.already_confirmed");
  });

  it("passes for cerere and re-accept anulata", () => {
    expect(() =>
      assertBookingConfirmable({ status: "cerere_noua" }),
    ).not.toThrow();
    expect(() => assertBookingConfirmable({ status: "anulata" })).not.toThrow();
  });
});
