import { describe, test, expect } from "vitest";
import { validateCheckin } from "../validate";
import type {
  CheckinFormData,
  CheckinGuestInput,
  CheckinSettings,
  BookingForCheckin,
} from "../types";

const VALID_CNP = "1850101410014";

const defaultSettings: CheckinSettings = {
  pension_display_name: "Casa Emil",
  checkin_doc_rule: "recommended",
  checkin_phone_rule: "recommended",
  checkin_cnp_rule: "required",
  checkin_payment_rule: "at_checkout",
  checkin_min_payment_pct: 30,
  checkin_deposit: false,
  checkin_deposit_amount: 0,
  walkin_allowed: true,
  group_checkin_mode: "both",
  checkin_time_from: "14:00",
  checkout_time_until: "12:00",
  checkout_block_unpaid: true,
  late_checkout_allowed: true,
  late_checkout_fee: 0,
  early_checkin_allowed: true,
  early_checkin_fee: 0,
  fisa_property_address: null,
  fisa_owner_cui: null,
  fisa_tourism_license: null,
};

const defaultBooking: BookingForCheckin = {
  id: "b1",
  status: "confirmata",
  total_price: 500,
  check_in: "2026-06-10",
  check_out: "2026-06-13",
  guest_name: "Ion Popescu",
  guest_phone: "+40700000000",
  guest_email: "ion@example.com",
  num_adults: 2,
  num_children: 0,
};

function roGuest(overrides?: Partial<CheckinGuestInput>): CheckinGuestInput {
  return {
    full_name: "Popescu Ion",
    last_name: "Popescu",
    first_name: "Ion",
    phone: "+40700000000",
    national_id: VALID_CNP,
    document_type: "ci",
    document_series: "XZ",
    document_number: "123456",
    nationality: "România",
    birth_date: "1985-01-01",
    ...overrides,
  };
}

function makeData(overrides?: Partial<CheckinFormData>): CheckinFormData {
  return {
    type: "reservation",
    booking_id: "b1",
    guests: [roGuest()],
    payment_status: "paid",
    payment_amount_paid: 500,
    ...overrides,
  };
}

describe("validateCheckin", () => {
  test("returns ok when all data is complete", () => {
    const result = validateCheckin(
      makeData(),
      defaultSettings,
      defaultBooking,
      "15:00",
    );
    expect(result.status).toBe("ok");
    expect(result.flags).toEqual([]);
    expect(result.blockers).toEqual([]);
  });

  test("blocks when CNP missing for Romanian guest", () => {
    const data = makeData({
      guests: [roGuest({ national_id: "" })],
    });
    const result = validateCheckin(data, defaultSettings, defaultBooking, "15:00");
    expect(result.status).toBe("blocked");
    expect(result.blockers.some((b) => b.includes("CNP"))).toBe(true);
  });

  test("returns warning when document is missing and rule is recommended", () => {
    const settings = { ...defaultSettings, checkin_cnp_rule: "optional" as const };
    const data = makeData({
      guests: [
        roGuest({
          nationality: "Germania",
          national_id: "",
          document_number: "",
          document_series: "",
        }),
      ],
    });
    const result = validateCheckin(data, settings, defaultBooking);
    expect(result.status).toBe("warning");
    expect(result.flags).toContain("no_document");
  });

  test("returns blocked when document is missing and rule is required", () => {
    const settings = { ...defaultSettings, checkin_doc_rule: "required" as const };
    const data = makeData({
      guests: [
        roGuest({
          nationality: "Germania",
          national_id: "",
          document_number: "",
          document_series: "",
        }),
      ],
    });
    const result = validateCheckin(data, settings, defaultBooking);
    expect(result.status).toBe("blocked");
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  test("no flag when document is missing and rule is optional", () => {
    const settings = { ...defaultSettings, checkin_doc_rule: "optional" as const };
    const data = makeData({
      guests: [roGuest()],
    });
    const result = validateCheckin(data, settings, defaultBooking);
    expect(result.flags).not.toContain("no_document");
  });

  test("returns warning for missing phone when recommended", () => {
    const data = makeData({
      guests: [roGuest({ phone: "" })],
    });
    const result = validateCheckin(data, defaultSettings, defaultBooking);
    expect(result.flags).toContain("no_phone");
  });

  test("blocks when phone required and missing", () => {
    const settings = { ...defaultSettings, checkin_phone_rule: "required" as const };
    const data = makeData({
      guests: [roGuest({ phone: "" })],
    });
    const result = validateCheckin(data, settings, defaultBooking);
    expect(result.status).toBe("blocked");
  });

  test("blocks when full payment required but not paid", () => {
    const settings = { ...defaultSettings, checkin_payment_rule: "full" as const };
    const data = makeData({ payment_amount_paid: 200 });
    const result = validateCheckin(data, settings, defaultBooking);
    expect(result.status).toBe("blocked");
    expect(result.blockers[0]).toContain("integrala");
  });

  test("blocks when partial payment below minimum %", () => {
    const settings = {
      ...defaultSettings,
      checkin_payment_rule: "partial" as const,
      checkin_min_payment_pct: 50,
    };
    const data = makeData({ payment_amount_paid: 100 }); // 20% of 500
    const result = validateCheckin(data, settings, defaultBooking);
    expect(result.status).toBe("blocked");
  });

  test("allows partial payment above minimum %", () => {
    const settings = {
      ...defaultSettings,
      checkin_payment_rule: "partial" as const,
      checkin_min_payment_pct: 30,
    };
    const data = makeData({ payment_amount_paid: 200 }); // 40% of 500
    const result = validateCheckin(data, settings, defaultBooking);
    expect(result.status).not.toBe("blocked");
  });

  test("flags unpaid when at_checkout rule and no payment", () => {
    const data = makeData({ payment_status: "unpaid", payment_amount_paid: 0 });
    const result = validateCheckin(data, defaultSettings, defaultBooking);
    expect(result.flags).toContain("unpaid");
  });

  test("online mock counts as full payment for validation", () => {
    const settings = { ...defaultSettings, checkin_payment_rule: "full" as const };
    const data = makeData({
      payment_status: "online",
      payment_amount_paid: defaultBooking.total_price,
    });
    const result = validateCheckin(data, settings, defaultBooking, "15:00");
    expect(result.status).not.toBe("blocked");
  });

  test("blocks walk-in when not allowed", () => {
    const settings = { ...defaultSettings, walkin_allowed: false };
    const data = makeData({ type: "walkin" });
    const result = validateCheckin(data, settings, defaultBooking);
    expect(result.status).toBe("blocked");
  });

  test("allows walk-in when allowed", () => {
    const data = makeData({ type: "walkin" });
    const result = validateCheckin(data, defaultSettings, defaultBooking, "15:00");
    expect(result.status).toBe("ok");
  });

  test("blocks when before check-in hour", () => {
    const data = makeData();
    const result = validateCheckin(data, defaultSettings, defaultBooking, "10:00");
    expect(result.status).toBe("blocked");
    expect(result.blockers[0]).toContain("14:00");
  });

  test("allows when on time", () => {
    const data = makeData();
    const result = validateCheckin(data, defaultSettings, defaultBooking, "15:00");
    expect(result.status).toBe("ok");
  });

  test("no time block when checkin_time_from is null", () => {
    const settings = { ...defaultSettings, checkin_time_from: null };
    const data = makeData();
    const result = validateCheckin(data, settings, defaultBooking, "08:00");
    expect(result.status).toBe("ok");
  });

  // ── DATE TESTS ─────────────────────────────────────────────

  test("blocks when today is after check-in date", () => {
    const data = makeData();
    const result = validateCheckin(
      data,
      defaultSettings,
      defaultBooking,
      "15:00",
      "2026-06-12", // check_in is 2026-06-10
    );
    expect(result.status).toBe("blocked");
    expect(result.blockers[0]).toContain("2026-06-10");
  });

  test("blocks when today is before check-in date", () => {
    const data = makeData();
    const result = validateCheckin(
      data,
      defaultSettings,
      defaultBooking,
      "15:00",
      "2026-06-09", // 1 day before check_in
    );
    expect(result.status).toBe("blocked");
  });

  test("allows check-in only on the check-in date", () => {
    const data = makeData();
    const result = validateCheckin(
      data,
      defaultSettings,
      defaultBooking,
      "15:00",
      "2026-06-10", // exact check_in date
    );
    expect(result.status).toBe("ok");
  });

  test("no date check when today is not provided", () => {
    const data = makeData();
    const result = validateCheckin(data, defaultSettings, defaultBooking, "15:00");
    expect(result.status).toBe("ok");
  });

  // ── TIME-BASED BLOCK ──────────────────────────────────────

  test("blocks when before check-in hour on the check-in day", () => {
    const data = makeData();
    const result = validateCheckin(
      data,
      defaultSettings,
      defaultBooking,
      "10:00",
      "2026-06-10",
    );
    expect(result.status).toBe("blocked");
    expect(result.blockers[0]).toContain("14:00");
  });

  test("allows when at or after check-in hour on the check-in day", () => {
    const data = makeData();
    const result = validateCheckin(
      data,
      defaultSettings,
      defaultBooking,
      "14:00",
      "2026-06-10",
    );
    expect(result.status).toBe("ok");
  });
});
