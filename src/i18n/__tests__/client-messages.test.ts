import { describe, expect, it } from "vitest";
import { pickMessages } from "@/i18n/client-messages";
import ro from "../../../messages/ro.json";

describe("texts sent to the browser", () => {
  it("keeps whole namespaces and single parts of one, and skips what is missing", () => {
    const messages = { common: { ok: "OK" }, admin: { common: { save: "Salvează" }, nav: { home: "Acasă" } }, public: {} };
    expect(pickMessages(messages, ["common", "admin.common", "missing", "admin.missing"])).toEqual({
      common: { ok: "OK" },
      admin: { common: { save: "Salvează" } },
    });
  });

  it("sends a guest on the public site a small part of the app's texts", () => {
    const shared = pickMessages(ro, ["common", "errors", "public", "party", "booking", "bookingIdentity"]);
    expect(shared).not.toHaveProperty("admin");
    expect(JSON.stringify(shared).length).toBeLessThan(JSON.stringify(ro).length / 5);
  });
});
