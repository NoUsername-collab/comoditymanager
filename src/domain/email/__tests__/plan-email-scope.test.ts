import { describe, expect, it } from "vitest";
import { planAllowsEmailKind } from "@/domain/email/plan-email-scope";

describe("planAllowsEmailKind", () => {
  it("blocks every message when the plan does not send", () => {
    expect(planAllowsEmailKind("none", "confirmation")).toBe(false);
    expect(planAllowsEmailKind("none", "stay")).toBe(false);
  });

  it("allows only the confirmation on the confirmation scope", () => {
    expect(planAllowsEmailKind("confirmation", "confirmation")).toBe(true);
    expect(planAllowsEmailKind("confirmation", "stay")).toBe(false);
  });

  it("allows confirmation and stay messages on the stay scope", () => {
    expect(planAllowsEmailKind("stay", "confirmation")).toBe(true);
    expect(planAllowsEmailKind("stay", "stay")).toBe(true);
  });
});
