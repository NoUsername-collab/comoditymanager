import { describe, expect, it } from "vitest";
import { emailUsageAlertLevel, emailUsagePercent } from "../usage-alert";

describe("emailUsageAlertLevel", () => {
  it("returns unlimited when cap is null", () => {
    expect(emailUsageAlertLevel(100, null)).toBe("unlimited");
  });

  it("returns exceeded at 100%", () => {
    expect(emailUsageAlertLevel(300, 300)).toBe("exceeded");
    expect(emailUsageAlertLevel(301, 300)).toBe("exceeded");
  });

  it("returns warning at 90% threshold", () => {
    expect(emailUsageAlertLevel(270, 300)).toBe("warning");
    expect(emailUsageAlertLevel(269, 300)).toBe("ok");
  });

  it("returns ok below warning threshold", () => {
    expect(emailUsageAlertLevel(0, 300)).toBe("ok");
    expect(emailUsageAlertLevel(100, 300)).toBe("ok");
  });
});

describe("emailUsagePercent", () => {
  it("returns null for unlimited cap", () => {
    expect(emailUsagePercent(50, null)).toBeNull();
  });

  it("rounds percentage and caps at 100", () => {
    expect(emailUsagePercent(150, 200)).toBe(75);
    expect(emailUsagePercent(250, 200)).toBe(100);
  });
});
