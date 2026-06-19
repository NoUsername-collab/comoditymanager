import { describe, test, expect } from "vitest";
import {
  assessPendingCheckinReadiness,
  type PendingCheckinSnapshot,
  type PendingReadinessNow,
} from "../pending-readiness";
import type { CheckinSettings } from "../types";

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
  early_checkout_allowed: true,
  early_checkout_fee: 0,
  checkin_key_rule: "always",
  checkin_ids_per_room: "one",
  checkin_ids_per_room_custom: null,
  fisa_property_address: null,
  fisa_owner_cui: null,
  fisa_tourism_license: null,
};

const now: PendingReadinessNow = {
  today: "2026-06-10",
  currentHour: "15:00",
};

function makeSnapshot(
  overrides?: Partial<PendingCheckinSnapshot>,
): PendingCheckinSnapshot {
  return {
    checkInDate: "2026-06-10",
    totalPrice: 500,
    guestPhone: "+40700000000",
    guestIdentityStatus: "complete",
    paymentStatus: "paid",
    paymentAmountPaid: 500,
    roomNames: ["Camera 1"],
    ...overrides,
  };
}

describe("assessPendingCheckinReadiness", () => {
  test("returns ok when snapshot is fully ready", () => {
    const result = assessPendingCheckinReadiness(
      makeSnapshot(),
      defaultSettings,
      now,
    );
    expect(result.status).toBe("ok");
    expect(result.flags).toEqual([]);
    expect(result.blockers).toEqual([]);
  });

  test("blocks when identity is draft and CNP is required", () => {
    const result = assessPendingCheckinReadiness(
      makeSnapshot({ guestIdentityStatus: "draft" }),
      defaultSettings,
      now,
    );
    expect(result.status).toBe("blocked");
    expect(result.flags).toContain("no_cnp");
    expect(result.flags).toContain("no_document");
    expect(result.blockers.some((b) => b.includes("CNP"))).toBe(true);
  });

  test("warns when identity is partial and CNP is recommended", () => {
    const settings = {
      ...defaultSettings,
      checkin_cnp_rule: "recommended" as const,
      checkin_doc_rule: "optional" as const,
    };
    const result = assessPendingCheckinReadiness(
      makeSnapshot({ guestIdentityStatus: "partial" }),
      settings,
      now,
    );
    expect(result.status).toBe("warning");
    expect(result.flags).toContain("no_cnp");
    expect(result.blockers).toEqual([]);
  });

  test("blocks when phone is missing and required", () => {
    const settings = {
      ...defaultSettings,
      checkin_phone_rule: "required" as const,
    };
    const result = assessPendingCheckinReadiness(
      makeSnapshot({ guestPhone: null }),
      settings,
      now,
    );
    expect(result.status).toBe("blocked");
    expect(result.flags).toContain("no_phone");
  });

  test("warns when phone is missing and recommended", () => {
    const result = assessPendingCheckinReadiness(
      makeSnapshot({ guestPhone: "" }),
      defaultSettings,
      now,
    );
    expect(result.status).toBe("warning");
    expect(result.flags).toContain("no_phone");
  });

  test("blocks when full payment is required but unpaid", () => {
    const settings = {
      ...defaultSettings,
      checkin_payment_rule: "full" as const,
    };
    const result = assessPendingCheckinReadiness(
      makeSnapshot({
        paymentStatus: "unpaid",
        paymentAmountPaid: 0,
      }),
      settings,
      now,
    );
    expect(result.status).toBe("blocked");
    expect(result.blockers.some((b) => b.includes("Plata integrala"))).toBe(
      true,
    );
  });

  test("blocks when partial payment threshold is not met", () => {
    const settings = {
      ...defaultSettings,
      checkin_payment_rule: "partial" as const,
      checkin_min_payment_pct: 30,
    };
    const result = assessPendingCheckinReadiness(
      makeSnapshot({
        totalPrice: 500,
        paymentStatus: "partial",
        paymentAmountPaid: 50,
      }),
      settings,
      now,
    );
    expect(result.status).toBe("blocked");
    expect(result.blockers.some((b) => b.includes("30%"))).toBe(true);
  });

  test("flags unpaid when payment rule is at_checkout", () => {
    const result = assessPendingCheckinReadiness(
      makeSnapshot({
        paymentStatus: "unpaid",
        paymentAmountPaid: 0,
      }),
      defaultSettings,
      now,
    );
    expect(result.status).toBe("warning");
    expect(result.flags).toContain("unpaid");
  });

  test("blocks early check-in before configured hour on check-in day", () => {
    const result = assessPendingCheckinReadiness(
      makeSnapshot(),
      defaultSettings,
      { today: "2026-06-10", currentHour: "10:00" },
    );
    expect(result.status).toBe("blocked");
    expect(result.flags).toContain("early_checkin");
    expect(result.blockers.some((b) => b.includes("14:00"))).toBe(true);
  });

  test("does not block early check-in on a different day", () => {
    const result = assessPendingCheckinReadiness(
      makeSnapshot({ checkInDate: "2026-06-11" }),
      defaultSettings,
      { today: "2026-06-10", currentHour: "10:00" },
    );
    expect(result.flags).not.toContain("early_checkin");
  });

  test("warns when keys require verified ID but identity is incomplete", () => {
    const settings = {
      ...defaultSettings,
      checkin_key_rule: "id_verified" as const,
    };
    const result = assessPendingCheckinReadiness(
      makeSnapshot({ guestIdentityStatus: "partial" }),
      settings,
      now,
    );
    expect(result.flags).toContain("keys_blocked_no_id");
  });

  test("warns when keys require payment but threshold is not met", () => {
    const settings = {
      ...defaultSettings,
      checkin_key_rule: "paid" as const,
      checkin_payment_rule: "full" as const,
    };
    const result = assessPendingCheckinReadiness(
      makeSnapshot({
        guestIdentityStatus: "complete",
        paymentStatus: "unpaid",
        paymentAmountPaid: 0,
      }),
      settings,
      now,
    );
    expect(result.status).toBe("blocked");
    expect(result.flags).toContain("keys_blocked_unpaid");
  });

  test("uses payment amount from status when amount is null", () => {
    const settings = {
      ...defaultSettings,
      checkin_payment_rule: "full" as const,
      checkin_key_rule: "always" as const,
    };
    const result = assessPendingCheckinReadiness(
      makeSnapshot({
        paymentStatus: "paid",
        paymentAmountPaid: null,
      }),
      settings,
      now,
    );
    expect(result.status).toBe("ok");
  });
});
