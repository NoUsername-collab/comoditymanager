import { describe, expect, it } from "vitest";
import {
  buildTenantOnboardingChecklist,
  onboardingProgressTone,
  quickSetupIncomplete,
} from "../tenant-onboarding";

describe("buildTenantOnboardingChecklist", () => {
  it("counts only required items toward readiness", () => {
    const checklist = buildTenantOnboardingChecklist([
      { id: "status_ok", ok: true, required: true },
      { id: "owner_email", ok: false, required: true },
      { id: "plan_modules", ok: false, required: false },
    ]);

    expect(checklist.readyCount).toBe(1);
    expect(checklist.totalRequired).toBe(2);
    expect(checklist.isGoLiveReady).toBe(false);
  });

  it("marks go-live ready when all required items pass", () => {
    const checklist = buildTenantOnboardingChecklist([
      { id: "status_ok", ok: true, required: true },
      { id: "owner_email", ok: true, required: true },
      { id: "plan_modules", ok: false, required: false },
    ]);

    expect(checklist.isGoLiveReady).toBe(true);
  });
});

describe("onboardingProgressTone", () => {
  it("maps completion ratio to tone", () => {
    expect(onboardingProgressTone(3, 3)).toBe("ok");
    expect(onboardingProgressTone(2, 3)).toBe("warn");
    expect(onboardingProgressTone(1, 3)).toBe("bad");
  });
});

describe("quickSetupIncomplete", () => {
  const base = {
    status: "active",
    owner_email: "owner@example.com",
    room_count: 2,
    member_count: 1,
    domain_hosts: ["example.zalmox.app"],
  };

  it("returns false when quick checks pass", () => {
    expect(quickSetupIncomplete(base)).toBe(false);
  });

  it("flags missing owner email", () => {
    expect(quickSetupIncomplete({ ...base, owner_email: "" })).toBe(true);
  });

  it("flags suspended status", () => {
    expect(quickSetupIncomplete({ ...base, status: "suspended" })).toBe(true);
  });
});
