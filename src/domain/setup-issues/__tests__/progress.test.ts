import { describe, expect, it } from "vitest";
import { isEmailChannelConfigured, isIdentityConfigured } from "../progress";

describe("isIdentityConfigured", () => {
  it("requires at least two characters", () => {
    expect(isIdentityConfigured("")).toBe(false);
    expect(isIdentityConfigured("A")).toBe(false);
    expect(isIdentityConfigured("Casa Emil")).toBe(true);
  });
});

describe("isEmailChannelConfigured", () => {
  it("is true when sender or reply-to is set", () => {
    expect(isEmailChannelConfigured({ emailReplyTo: "a@b.ro" })).toBe(true);
    expect(isEmailChannelConfigured({ emailFromName: "Casa" })).toBe(true);
    expect(isEmailChannelConfigured({ emailFromAddress: "noreply@b.ro" })).toBe(
      true,
    );
    expect(isEmailChannelConfigured({})).toBe(false);
  });
});
