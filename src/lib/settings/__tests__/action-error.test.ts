import { afterEach, describe, expect, it, vi } from "vitest";
import { settingsActionErrorMessage } from "@/lib/settings/action-error";

const t = (key: string) => `t:${key}`;

describe("settingsActionErrorMessage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps a known service code to its text", () => {
    const error = new Error("settings.pension_settings_missing");
    expect(
      settingsActionErrorMessage(error, t, { "settings.pension_settings_missing": "missing" }),
    ).toBe("missing");
  });

  it("maps auth codes to roleForbidden", () => {
    expect(settingsActionErrorMessage(new Error("auth.role_forbidden"), t)).toBe("t:roleForbidden");
  });

  it("never shows a raw database message", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error('column "logo_url" of relation "pension_settings" does not exist');
    expect(settingsActionErrorMessage(error, t)).toBe("t:genericError");
    expect(log).toHaveBeenCalled();
  });
});
